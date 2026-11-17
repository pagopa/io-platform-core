import type {
  ContextualInputMapper,
  DefaultSuccessOutput,
  EnsureErrorResponsePayloads,
  EnsureHttpMiddlewareSequence,
  EnsureResponseCoversErrors,
  EnsureValidationErrorDeclared,
  HttpMiddlewareContext,
  HttpMiddlewareErrors,
  HttpMiddlewareSequence,
  HttpRequestPayload,
  ParamObjectSchema,
  ResponseEntry,
  ResponseMap,
  RouteContract,
  RouteRequestSchemas,
  SuccessResponseFromMap,
  SuccessStatusFromMap,
  WireRequest,
} from "@pagopa/hexagonal-core/adapters";
import type { BaseError } from "@pagopa/hexagonal-core/domain/errors";
import type {
  InputValidator,
  UseCase,
} from "@pagopa/hexagonal-core/domain/ports";
import type { FastifyInstance, FastifyRequest } from "fastify";

import {
  assertResponseCategories,
  assertSupportedResponseHeaders,
  createHttpRequestPayloadValidator,
  executeHttpRequestPipeline,
  getEntryHeaders,
  getEntrySchema,
  isNoBodyStatus,
  isRedirectEntry,
  isSuccessStatus,
} from "@pagopa/hexagonal-core/adapters";
import { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import { validateHeaderName, validateHeaderValue } from "node:http";
import { z as zod } from "zod";

import {
  ErrorResponderConfig,
  sendContractErrorResponse,
} from "./errorResponder.js";
import {
  createHttpHandlerFromExecution,
  type ErrorResponder,
  type SuccessResponder,
} from "./httpHandlerBuilder.js";
import { fastifyExtractPayload } from "./validator/fastifyRequestValidator.js";

const fastifyMethod = {
  delete: "DELETE",
  get: "GET",
  patch: "PATCH",
  post: "POST",
  put: "PUT",
} as const;

type EnsureDeclaredHeaders<R extends ResponseMap, M> =
  false extends HeaderKeysValid<R, M> ? never : unknown;

type HeaderKeysValid<R extends ResponseMap, M> = M extends { status: infer S }
  ? S extends SuccessStatusFromMap<R>
    ? M extends { headers?: infer H }
      ? H extends unknown
        ? H extends null | undefined
          ? true
          : Exclude<
                keyof H,
                Extract<SuccessResponseFromMap<R>, { status: S }> extends {
                  headers?: infer Allowed;
                }
                  ? keyof NonNullable<Allowed>
                  : never
              > extends never
            ? true
            : false
        : never
      : true
    : false
  : false;

/** A declared success entry indexed by status. */
interface ResolvedSuccessEntry {
  defaultLocation: string;
  duplicateHeaders: boolean;
  entry: ResponseEntry;
  hasHeaders: boolean;
  headerNames: Map<string, string>;
  headerSchema: ParamObjectSchema | undefined;
  status: number;
}

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
  path.replace(/\{([^{}]+)\}/g, ":$1");

/** Resolve all successes without selecting one by declaration order. */
const resolveSuccessEntries = (
  response: ResponseMap,
): Map<number, ResolvedSuccessEntry> => {
  const matches = new Map<number, ResolvedSuccessEntry>();
  for (const [key, entry] of Object.entries(response)) {
    const status = Number(key);
    if (isSuccessStatus(status)) {
      const headerSchema = getEntryHeaders(entry);
      const headerNames = new Map<string, string>();
      let duplicateHeaders = false;
      for (const name of Object.keys(headerSchema?.shape ?? {})) {
        const lower = name.toLowerCase();
        if (headerNames.has(lower)) duplicateHeaders = true;
        headerNames.set(lower, name);
      }
      matches.set(status, {
        defaultLocation: headerNames.get("location") ?? "location",
        duplicateHeaders,
        entry,
        hasHeaders: headerSchema !== undefined || isRedirectEntry(entry),
        headerNames,
        headerSchema,
        status,
      });
    }
  }
  if (matches.size === 0) {
    throw new Error(
      "mountFastifyRoute: no success entry found in response map.",
    );
  }
  return matches;
};

const normalizeHeaders = (
  entry: ResolvedSuccessEntry,
  raw: unknown,
  redirect: boolean,
) => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw))
    return undefined;
  const inputs: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (const [key, value] of Object.entries(raw)) {
    const lower = key.toLowerCase();
    if (
      seen.has(lower) ||
      (!entry.headerNames.has(lower) && !(redirect && lower === "location"))
    )
      return undefined;
    seen.add(lower);
    inputs[entry.headerNames.get(lower) ?? "location"] = value;
  }
  const hasLocation = entry.headerNames.has("location");
  const implicitLocation =
    redirect && !hasLocation ? inputs.location : undefined;
  if (redirect && !hasLocation) delete inputs.location;
  return { hasLocation, implicitLocation, inputs };
};

const decodeHeaders = async (
  entry: ResolvedSuccessEntry,
  raw: unknown,
  redirect: boolean,
) => {
  if (entry.duplicateHeaders) return undefined;
  const normalized = normalizeHeaders(
    entry,
    raw === undefined ? {} : raw,
    redirect,
  );
  if (!normalized) return undefined;
  const { hasLocation, implicitLocation, inputs } = normalized;
  const schema = entry.headerSchema;
  let headers: Record<string, unknown> = inputs;
  if (schema) {
    const parsed = await schema.safeParseAsync(inputs);
    if (!parsed.success) return undefined;
    headers = parsed.data;
  }
  if (redirect && !hasLocation) headers.location = implicitLocation;
  if (redirect) {
    const location = Object.entries(headers).find(
      ([key]) => key.toLowerCase() === "location",
    )?.[1];
    if (typeof location !== "string" || location.length === 0) return undefined;
  }
  const validated: Record<string, number | string | string[]> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      !(Array.isArray(value) && value.every((item) => typeof item === "string"))
    )
      return undefined;
    validateHeaderName(key);
    for (const item of Array.isArray(value) ? value : [value]) {
      validateHeaderValue(key, String(item));
    }
    validated[key] = value;
  }
  return validated;
};

const defaultResponse = (
  entry: ResolvedSuccessEntry | undefined,
  output: unknown,
) => {
  if (!entry) return undefined;
  if (isRedirectEntry(entry.entry)) {
    if (typeof output !== "string" || output.length === 0) return undefined;
    return {
      headers: { [entry.defaultLocation]: output },
      status: entry.status,
    };
  }
  return isNoBodyStatus(entry.status)
    ? { status: entry.status }
    : { body: output, status: entry.status };
};

const clearSuccessHeaders = (
  reply: Parameters<ErrorResponder>[0],
  entries: Map<number, ResolvedSuccessEntry>,
): void => {
  for (const { entry, headerSchema } of entries.values()) {
    for (const key of Object.keys(headerSchema?.shape ?? {})) {
      reply.removeHeader(key);
    }
    if (isRedirectEntry(entry)) reply.removeHeader("location");
  }
};

/** Validate every success component before mutating the Fastify reply. */
const buildSuccessResponder = <O>(
  entries: Map<number, ResolvedSuccessEntry>,
  outputMapper: ((output: O) => unknown) | undefined,
  onError: ErrorResponder,
  committedReplies: WeakSet<Parameters<ErrorResponder>[0]>,
): SuccessResponder<O> => {
  if (!outputMapper && entries.size !== 1) {
    throw new Error(
      "mountFastifyRoute: multiple success entries require an output mapper.",
    );
  }
  const only = entries.size === 1 ? entries.values().next().value : undefined;
  return async (output, reply) => {
    const invalid = () =>
      onError(reply, new GenericError("Output encoding failed."));
    try {
      const mapped: unknown = outputMapper
        ? outputMapper(output)
        : defaultResponse(only, output);
      if (!mapped || typeof mapped !== "object" || Array.isArray(mapped))
        return invalid();
      const description = mapped as {
        body?: unknown;
        headers?: unknown;
        status?: unknown;
      };
      if (typeof description.status !== "number") return invalid();
      const selected = entries.get(description.status);
      if (!selected) return invalid();
      const redirect = isRedirectEntry(selected.entry);
      const noBody = isNoBodyStatus(selected.status);
      if (noBody && "body" in description) return invalid();
      let body: unknown;
      if (!noBody && !isRedirectEntry(selected.entry)) {
        if (!("body" in description)) return invalid();
        const result = await getEntrySchema(selected.entry).safeParseAsync(
          description.body,
        );
        if (!result.success) return invalid();
        body = result.data;
      }

      if (selected.hasHeaders || description.headers !== undefined) {
        const validatedHeaders = await decodeHeaders(
          selected,
          description.headers,
          redirect,
        );
        if (!validatedHeaders) return invalid();
        committedReplies.add(reply);
        reply.code(selected.status);
        for (const [key, value] of Object.entries(validatedHeaders)) {
          reply.header(key, value);
        }
      } else {
        committedReplies.add(reply);
        reply.code(selected.status);
      }
      return noBody ? reply.send() : reply.send(body);
    } catch {
      if (committedReplies.delete(reply)) clearSuccessHeaders(reply, entries);
      return invalid();
    }
  };
};

/**
 * Mounts a route contract with validated request and success responses.
 * An explicit output mapper returns a status-discriminated response; the
 * default is available only for one success without extra required headers.
 * All response components are validated before the reply is modified.
 *
 * Compile-time guarantees enforced via the parameter types:
 *  2. every HTTP status the use case can fail with MUST appear as a key in
 *     `contract.response` (via {@link EnsureResponseCoversErrors});
 *  3. `inputMapper` receives the validated wire request shape derived from
 *     `contract.request` and must return the use-case input type. It also
 *     receives the context accumulated by the ordered middleware tuple;
 *  4. when `contract.request` validates any part (body/headers/path/query),
 *     `contract.response` MUST declare a `400` entry (via
 *     {@link EnsureValidationErrorDeclared}) — the adapter always emits `400`
 *     on a validation failure, so a validating contract without one would be
 *     inconsistent with the adapter's actual runtime behavior.
 *  5. every non-success response schema MUST accept and return RFC 7807
 *     Problem Details (via {@link EnsureErrorResponsePayloads}); runtime
 *     validation falls back to `500` if a contract is bypassed or a refinement
 *     rejects the mapped error payload.
 *
 * @typeParam Req Request schemas declared by the contract.
 * @typeParam Resp Response map declared by the contract.
 * @typeParam UseCaseInput Input type accepted by the use case.
 * @typeParam O Use-case output type.
 * @typeParam E Domain error type the use case can return.
 * @param server The Fastify instance to mount the route on.
 * @param spec The route contract, input mapper, use case and optional output
 *   mapper.
 * @param config Optional error responder configuration.
 */
export function mountFastifyRoute<
  Req extends RouteRequestSchemas,
  const Resp extends ResponseMap,
  UseCaseInput extends object,
  O,
  M extends SuccessResponseFromMap<Resp>,
  E extends BaseError = never,
  const Middlewares extends HttpMiddlewareSequence = readonly [],
>(
  server: FastifyInstance,
  spec: {
    contract: NoInfer<EnsureErrorResponsePayloads<Resp>> &
      NoInfer<EnsureValidationErrorDeclared<Req, Resp>> &
      RouteContract<Req, Resp>;
    inputMapper: (
      req: WireRequest<Req>,
      context: Readonly<HttpMiddlewareContext<NoInfer<Middlewares>>>,
    ) => UseCaseInput;
    middlewares?: Middlewares &
      NoInfer<EnsureHttpMiddlewareSequence<Middlewares>>;
    outputMapper: ((output: O) => M) & NoInfer<EnsureDeclaredHeaders<Resp, M>>;
    useCase: NoInfer<
      EnsureResponseCoversErrors<E | HttpMiddlewareErrors<Middlewares>, Resp>
    > &
      UseCase<UseCaseInput, O, E>;
  },
  config?: ErrorResponderConfig,
): void;
export function mountFastifyRoute<
  Req extends RouteRequestSchemas,
  const Resp extends ResponseMap,
  UseCaseInput extends object,
  E extends BaseError = never,
  const Middlewares extends HttpMiddlewareSequence = readonly [],
>(
  server: FastifyInstance,
  spec: {
    contract: NoInfer<EnsureErrorResponsePayloads<Resp>> &
      NoInfer<EnsureValidationErrorDeclared<Req, Resp>> &
      RouteContract<Req, Resp>;
    inputMapper: (
      req: WireRequest<Req>,
      context: Readonly<HttpMiddlewareContext<NoInfer<Middlewares>>>,
    ) => UseCaseInput;
    middlewares?: Middlewares &
      NoInfer<EnsureHttpMiddlewareSequence<Middlewares>>;
    useCase: NoInfer<
      ([SuccessStatusFromMap<Resp>] extends [never]
        ? unknown
        : [DefaultSuccessOutput<Resp>] extends [never]
          ? never
          : unknown) &
        EnsureResponseCoversErrors<E | HttpMiddlewareErrors<Middlewares>, Resp>
    > &
      UseCase<
        UseCaseInput,
        [SuccessStatusFromMap<Resp>] extends [never]
          ? unknown
          : DefaultSuccessOutput<Resp>,
        E
      >;
  },
  config?: ErrorResponderConfig,
): void;
export function mountFastifyRoute<
  Req extends RouteRequestSchemas,
  const Resp extends ResponseMap,
  UseCaseInput extends object,
  O,
  E extends BaseError,
  Middlewares extends HttpMiddlewareSequence = readonly [],
>(
  server: FastifyInstance,
  spec: {
    contract: RouteContract<Req, Resp>;
    inputMapper: (
      req: WireRequest<Req>,
      context: Readonly<HttpMiddlewareContext<Middlewares>>,
    ) => UseCaseInput;
    middlewares?: Middlewares &
      NoInfer<EnsureHttpMiddlewareSequence<Middlewares>>;
    outputMapper?: (output: O) => SuccessResponseFromMap<Resp>;
    useCase: UseCase<UseCaseInput, O, E>;
  },
  config?: ErrorResponderConfig,
): void {
  assertSupportedResponseHeaders(spec.contract.response);
  assertResponseCategories(spec.contract.response);
  const successEntries = resolveSuccessEntries(spec.contract.response);
  const committedReplies = new WeakSet<Parameters<ErrorResponder>[0]>();

  const wire = buildWireSchema(spec.contract.request);

  const validator = createHttpRequestPayloadValidator(
    wire as Parameters<typeof createHttpRequestPayloadValidator>[0],
  ) as InputValidator<HttpRequestPayload, WireRequest<Req>>;

  const onError: ErrorResponder = (reply, error) =>
    sendContractErrorResponse(reply, error, spec.contract.response, config);

  const onSuccess = buildSuccessResponder<O>(
    successEntries,
    spec.outputMapper,
    onError,
    committedReplies,
  );

  const execute = (request: FastifyRequest) => {
    const payload = fastifyExtractPayload(request);
    const inputMapper: ContextualInputMapper<
      WireRequest<Req>,
      HttpMiddlewareContext<Middlewares> | Record<never, never>,
      UseCaseInput
    > = (input, context) =>
      spec.inputMapper(
        input,
        context as Readonly<HttpMiddlewareContext<Middlewares>>,
      );

    return spec.middlewares
      ? executeHttpRequestPipeline(
          payload,
          validator,
          inputMapper,
          spec.useCase,
          spec.middlewares,
        )
      : executeHttpRequestPipeline(
          payload,
          validator,
          inputMapper,
          spec.useCase,
        );
  };

  const handler = createHttpHandlerFromExecution(
    execute,
    onSuccess,
    onError,
    config,
  );

  server.route({
    errorHandler: (error, _request, reply) => {
      if (committedReplies.delete(reply))
        clearSuccessHeaders(reply, successEntries);
      if (!("serialization" in error)) return reply.send(error);
      return onError(reply, new GenericError("Output encoding failed."));
    },
    handler,
    method: fastifyMethod[spec.contract.method],
    url: toFastifyPath(spec.contract.path),
  });
}
