import type {
  EnsureResponseCoversErrors,
  ResponseEntry,
  ResponseMap,
  RouteContract,
  RouteRequestSchemas,
  SuccessSchemaFromMap,
  WireRequest,
} from "@pagopa/hexagonal-core/adapters";
import type { BaseError } from "@pagopa/hexagonal-core/domain/errors";
import type {
  InputValidator,
  UseCase,
} from "@pagopa/hexagonal-core/domain/ports";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { z, ZodType } from "zod";

import {
  getEntrySchema,
  isRedirectEntry,
} from "@pagopa/hexagonal-core/adapters";
import { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import { z as zod } from "zod";

import { sendErrorResponse } from "./errorResponder.js";
import {
  createHttpHandler,
  type SuccessResponder,
  type SuccessStatusCode,
} from "./httpHandlerBuilder.js";
import { createFastifyRequestValidator } from "./validator/fastifyRequestValidator.js";

/** HTTP statuses the adapter mounts as a successful outcome (incl. redirects). */
const SUCCESS_STATUSES = new Set<number>([200, 201, 202, 204, 301, 302]);

/** Statuses that never carry a response body. */
const NO_BODY_STATUSES = new Set<number>([204, 301, 302]);

const fastifyMethod = {
  delete: "DELETE",
  get: "GET",
  patch: "PATCH",
  post: "POST",
  put: "PUT",
} as const;

/** A success entry resolved from a response map: its status and optional schema. */
interface ResolvedSuccessEntry {
  schema: undefined | ZodType;
  status: SuccessStatusCode;
}

/**
 * Body type the use case (or the output mapper) must produce for a contract's
 * success response. Redirect / no-body entries carry no schema, collapsing to
 * `void`; otherwise it is the `z.input` of the success schema.
 */
type SuccessBodyInput<Resp extends ResponseMap> = [
  SuccessSchemaFromMap<Resp>,
] extends [never]
  ? undefined
  : z.input<SuccessSchemaFromMap<Resp>>;

/**
 * Builds the Zod schema validated against the decomposed request. Missing parts
 * default to `unknown` so they impose no constraint.
 */
const buildWireSchema = (request: RouteRequestSchemas) =>
  zod.object({
    body: request.body ?? zod.unknown(),
    headers: request.headers ?? zod.unknown(),
    path: request.path ?? zod.unknown(),
    query: request.query ?? zod.unknown(),
  });

/** Converts an OpenAPI path (`/users/{id}`) to Fastify syntax (`/users/:id`). */
const toFastifyPath = (path: string): string =>
  path.replace(/\{([^}]+)\}/g, ":$1");

/**
 * Resolves the single success entry of a response map. Both 2xx codes and the
 * supported redirects (`301`/`302`) count as success; a redirect (or any
 * no-body) entry resolves to an `undefined` schema.
 *
 * @throws when the contract declares no success response, or more than one.
 */
const resolveSuccessEntry = (response: ResponseMap): ResolvedSuccessEntry => {
  const matches: ResolvedSuccessEntry[] = [];

  for (const [key, entry] of Object.entries(response)) {
    const status = Number(key);
    if (!SUCCESS_STATUSES.has(status)) continue;

    const typedEntry = entry as ResponseEntry;
    matches.push({
      schema: isRedirectEntry(typedEntry)
        ? undefined
        : getEntrySchema(typedEntry),
      status: status as SuccessStatusCode,
    });
  }

  if (matches.length === 0) {
    throw new Error(
      "mountFastifyRoute: no success entry found in response map. " +
        "Add a 200/201/202/204/301/302 entry to the contract response.",
    );
  }
  if (matches.length > 1) {
    throw new Error(
      "mountFastifyRoute: multiple success entries found in response map " +
        `(${matches.map((m) => m.status).join(", ")}). ` +
        "A contract must declare exactly one success response.",
    );
  }

  return matches[0];
};

/**
 * Builds the success responder: applies the optional output mapper, then — when
 * a body schema is present and the status carries a body — encodes the result
 * against the success schema inside the mount. Encoding failures surface as a
 * 500 because an output that fails its own contract is a server-side bug.
 * Redirect / no-body responses skip encoding and strip the body.
 */
const buildSuccessResponder = <O, R>(
  entry: ResolvedSuccessEntry,
  outputMapper?: (output: O) => R,
): SuccessResponder<O> => {
  const sendsBody =
    entry.schema !== undefined && !NO_BODY_STATUSES.has(entry.status);
  const schema = entry.schema;

  return async (output: O, reply: FastifyReply): Promise<FastifyReply> => {
    const mapped = outputMapper ? outputMapper(output) : (output as unknown);

    if (!sendsBody || schema === undefined) {
      return reply.code(entry.status).send();
    }

    const result = await schema["~standard"].validate(mapped);
    if (result.issues) {
      return sendErrorResponse(
        reply,
        new GenericError("Output encoding failed."),
      );
    }

    return reply.code(entry.status).send(result.value);
  };
};

/**
 * Mounts a route contract on a Fastify instance, wiring together request
 * validation, the input mapper, the use case, the optional output mapper and
 * the success status code (derived from the single success key of the
 * contract's response map — a 2xx code or a `301`/`302` redirect).
 *
 * This adapter is **registry-free**: it performs no OpenAPI registration. Feed
 * contracts to a `RouteRegistry` from `@pagopa/hexagonal-openapi` separately to
 * generate the spec.
 *
 * Execution flow on success: the use-case output is passed to `outputMapper`
 * (when provided), then the mapped value is encoded against the success schema
 * inside this mount — redirect / no-body responses skip encoding and strip the
 * body.
 *
 * Compile-time guarantees enforced via the parameter types:
 *  1. with an `outputMapper`, its return type MUST equal `z.input` of the
 *     success schema (or `void` for a redirect / no-body response); without it,
 *     the use-case output MUST equal that type directly;
 *  2. every HTTP status the use case can fail with MUST appear as a key in
 *     `contract.response` (via {@link EnsureResponseCoversErrors});
 *  3. `inputMapper` receives the validated wire request shape derived from
 *     `contract.request` and must return the use-case input type.
 *
 * @typeParam Req Request schemas declared by the contract.
 * @typeParam Resp Response map declared by the contract.
 * @typeParam UseCaseInput Input type accepted by the use case.
 * @typeParam O Use-case output type.
 * @typeParam E Domain error type the use case can return.
 * @param server The Fastify instance to mount the route on.
 * @param spec The route contract, input mapper, use case and optional output
 *   mapper.
 */
export function mountFastifyRoute<
  Req extends RouteRequestSchemas,
  const Resp extends ResponseMap,
  UseCaseInput extends object,
  O,
  E extends BaseError,
>(
  server: FastifyInstance,
  spec: {
    contract: RouteContract<Req, Resp>;
    inputMapper: (req: WireRequest<Req>) => UseCaseInput;
    outputMapper: (output: O) => SuccessBodyInput<Resp>;
    useCase: NoInfer<EnsureResponseCoversErrors<E, Resp>> &
      UseCase<UseCaseInput, O, E>;
  },
): void;
export function mountFastifyRoute<
  Req extends RouteRequestSchemas,
  const Resp extends ResponseMap,
  UseCaseInput extends object,
  E extends BaseError,
>(
  server: FastifyInstance,
  spec: {
    contract: RouteContract<Req, Resp>;
    inputMapper: (req: WireRequest<Req>) => UseCaseInput;
    useCase: NoInfer<EnsureResponseCoversErrors<E, Resp>> &
      UseCase<UseCaseInput, SuccessBodyInput<Resp>, E>;
  },
): void;
export function mountFastifyRoute<
  Req extends RouteRequestSchemas,
  const Resp extends ResponseMap,
  UseCaseInput extends object,
  O,
  E extends BaseError,
>(
  server: FastifyInstance,
  spec: {
    contract: RouteContract<Req, Resp>;
    inputMapper: (req: WireRequest<Req>) => UseCaseInput;
    outputMapper?: (output: O) => SuccessBodyInput<Resp>;
    useCase: UseCase<UseCaseInput, O, E>;
  },
): void {
  const successEntry = resolveSuccessEntry(spec.contract.response);

  const wire = buildWireSchema(spec.contract.request).transform((parts) =>
    spec.inputMapper(parts as WireRequest<Req>),
  );

  // The wire schema only contains body/headers/path/query keys, satisfying the
  // validator's structural constraint at runtime.
  const validator = createFastifyRequestValidator(
    wire as unknown as Parameters<typeof createFastifyRequestValidator>[0],
  ) as InputValidator<FastifyRequest, UseCaseInput>;

  const onSuccess = buildSuccessResponder<O, SuccessBodyInput<Resp>>(
    successEntry,
    spec.outputMapper,
  );

  const handler = createHttpHandler<UseCaseInput, O, E>(
    spec.useCase,
    validator,
    onSuccess,
  );

  server.route({
    handler,
    method: fastifyMethod[spec.contract.method],
    url: toFastifyPath(spec.contract.path),
  });
}
