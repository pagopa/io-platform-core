import type {
  EnsureResponseCoversErrors,
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
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { z, ZodType } from "zod";

import {
  createHttpResponseFormatter,
  getEntrySchema,
  isRedirectEntry,
} from "@pagopa/hexagonal-core/adapters";
import { z as zod } from "zod";

import {
  createHttpHandler,
  type SuccessStatusCode,
} from "./httpHandlerBuilder.js";
import { createFastifyRequestValidator } from "./validator/fastifyRequestValidator.js";

const SUCCESS_STATUSES = new Set([200, 201, 202, 204]);

const fastifyMethod = {
  delete: "DELETE",
  get: "GET",
  patch: "PATCH",
  post: "POST",
  put: "PUT",
} as const;

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
 * Extracts the first 2xx entry from a response map, returning its status code
 * and Zod schema. Throws when the contract declares no success response.
 */
const getSuccessEntry = (
  response: ResponseMap
): { schema: ZodType; status: SuccessStatusCode } => {
  for (const [key, entry] of Object.entries(response)) {
    const status = Number(key);
    if (SUCCESS_STATUSES.has(status) && !isRedirectEntry(entry)) {
      return {
        schema: getEntrySchema(entry),
        status: status as SuccessStatusCode,
      };
    }
  }
  throw new Error(
    "mountFastifyRoute: no 2xx entry found in response map. " +
      "Add a 200/201/202/204 entry to the contract response."
  );
};

/**
 * Mounts a route contract on a Fastify instance, wiring together request
 * validation, input transformation, the use case, response formatting and the
 * success status code (derived from the 2xx key of the contract's response map).
 *
 * This adapter is **registry-free**: it performs no OpenAPI registration. Feed
 * contracts to a `RouteRegistry` from `@pagopa/hexagonal-openapi` separately to
 * generate the spec.
 *
 * Compile-time guarantees enforced via the parameter types:
 *  1. the use-case output MUST equal `z.input` of the 2xx response schema;
 *  2. every HTTP status the use case can fail with MUST appear as a key in
 *     `contract.response` (via {@link EnsureResponseCoversErrors});
 *  3. `transformInput` receives the validated wire request shape derived from
 *     `contract.request` and must return the use-case input type.
 *
 * @typeParam Req Request schemas declared by the contract.
 * @typeParam Resp Response map declared by the contract.
 * @typeParam UseCaseInput Input type accepted by the use case.
 * @typeParam E Domain error type the use case can return.
 * @param server The Fastify instance to mount the route on.
 * @param spec The route contract, input transformer and use case.
 */
export const mountFastifyRoute = <
  Req extends RouteRequestSchemas,
  const Resp extends ResponseMap,
  UseCaseInput extends object,
  E extends BaseError
>(
  server: FastifyInstance,
  spec: {
    contract: RouteContract<Req, Resp>;
    transformInput: (req: WireRequest<Req>) => UseCaseInput;
    useCase: NoInfer<EnsureResponseCoversErrors<E, Resp>> &
      UseCase<UseCaseInput, z.input<SuccessSchemaFromMap<Resp>>, E>;
  }
): void => {
  const { schema: successSchema, status: successCode } = getSuccessEntry(
    spec.contract.response
  );

  const wire = buildWireSchema(spec.contract.request).transform((parts) =>
    spec.transformInput(parts as WireRequest<Req>)
  );

  // The wire schema only contains body/headers/path/query keys, satisfying the
  // validator's structural constraint at runtime.
  const validator = createFastifyRequestValidator(
    wire as unknown as Parameters<typeof createFastifyRequestValidator>[0]
  ) as InputValidator<FastifyRequest, UseCaseInput>;
  const formatter = createHttpResponseFormatter(successSchema);
  const handler = createHttpHandler(
    spec.useCase as UseCase<
      UseCaseInput,
      z.input<SuccessSchemaFromMap<Resp>>,
      E
    >,
    validator,
    formatter,
    { successCode }
  );

  server.route({
    handler,
    method: fastifyMethod[spec.contract.method],
    url: toFastifyPath(spec.contract.path),
  });
};
