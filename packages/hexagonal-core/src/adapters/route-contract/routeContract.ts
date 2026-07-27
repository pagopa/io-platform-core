import type { z, ZodObject, ZodType } from "zod";

import type { BaseError } from "../../domain/errors/index.js";
import type { ErrorKindToStatus } from "../error-mapper/errorHttpMetadata.js";
import type { ProblemDetails } from "../error-mapper/errorMapper.js";
import type { AdapterOnlyStatus, SuccessStatusCode } from "./httpStatus.js";

/** HTTP methods supported by a route contract. */
export type HttpMethod = "delete" | "get" | "patch" | "post" | "put";

/**
 * Zod object schema acceptable as a parameter container (headers / path /
 * query). Each property of the object becomes a single OpenAPI parameter.
 */
export type ParamObjectSchema = ZodObject;

/**
 * A redirect response entry (3xx). Carries no body; only a description and
 * optional response headers (e.g. `Location`). Use `redirect: true` as the
 * discriminant so the type system can distinguish it from schema-bearing
 * entries. Headers are expressed as raw OpenAPI schema objects.
 */
export interface RedirectEntry {
  description: string;
  headers?: Record<
    string,
    { description?: string; schema: Record<string, unknown> }
  >;
  redirect: true;
}

/**
 * A single entry in a {@link ResponseMap}: either a plain Zod schema (the
 * simple case), a richer object adding an optional description, or a redirect
 * entry (no body).
 */
export type ResponseEntry =
  | RedirectEntry
  | ZodType
  | { description?: string; schema: ZodType };

/** Returns true when the entry is a 3xx redirect (no body). */
export const isRedirectEntry = (entry: ResponseEntry): entry is RedirectEntry =>
  entry !== null &&
  (typeof entry === "object" || typeof entry === "function") &&
  !("~standard" in entry) &&
  "redirect" in entry &&
  (entry as RedirectEntry).redirect === true;

/**
 * Maps HTTP status codes to response entries. The map is the single source of
 * truth for both the OpenAPI generator (response documentation) and the adapter
 * runtime (success status / schema selection).
 *
 * @example
 * ```ts
 * {
 *   201: { description: "Created", schema: UserResponseSchema },
 *   400: ProblemJson,
 *   409: ProblemJson,
 * }
 * ```
 */
export type ResponseMap = Record<number, ResponseEntry>;

/**
 * Narrows a {@link ResponseEntry} to the underlying Zod schema. A plain
 * `ZodType` is returned as-is; a wrapper object exposes `.schema`.
 */
export const getEntrySchema = (
  entry: Exclude<ResponseEntry, RedirectEntry>,
): ZodType => (isZodTypeEntry(entry) ? entry : entry.schema);

/** Returns the optional description override for a response entry. */
export const getEntryDescription = (
  entry: ResponseEntry,
): string | undefined =>
  isZodTypeEntry(entry) ? undefined : entry.description;

const isZodTypeEntry = (entry: ResponseEntry): entry is ZodType =>
  entry !== null &&
  entry !== undefined &&
  (typeof entry === "object" || typeof entry === "function") &&
  "~standard" in entry;

/**
 * Ensures every declared non-success response can carry the RFC 7807 payload
 * emitted by the HTTP error mapper. The input check protects the adapter from
 * rejecting a mapped error; the output check prevents a schema transform from
 * changing the body into a non-Problem Details shape.
 */
export type EnsureErrorResponsePayloads<Resp extends ResponseMap> = [
  ErrorResponsePayloadIssues<Resp>,
] extends [never]
  ? unknown
  : ErrorResponsePayloadIssues<Resp>;

/**
 * Bidirectional check that collapses to `never` when the response map's error
 * codes do not exactly match the HTTP statuses the use case can produce.
 *
 * - **Forward** — every use-case error must have a response entry.
 * - **Backward** — every response key that is not a success status (2xx or a
 *   supported redirect) and not adapter-only (`400`) must correspond to a
 *   use-case error. `400` is excluded because the adapter always handles input
 *   validation failures regardless of what the use case declares.
 */
export type EnsureResponseCoversErrors<
  E extends BaseError,
  Resp extends ResponseMap,
> = [E] extends [never]
  ? [ErrorResponseKeysOf<Resp>] extends [never]
    ? unknown
    : never
  : [ErrorKindToStatus<E["kind"]>] extends [keyof Resp]
    ? [ErrorResponseKeysOf<Resp>] extends [ErrorKindToStatus<E["kind"]>]
      ? unknown
      : never
    : never;

/** Invariant equality check between two types. */
export type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

/**
 * A pure description of an HTTP route. Carries no runtime behavior; the single
 * source of truth for the adapter that mounts the route on a framework. Only
 * the fields actually needed to mount/execute a route live here. OpenAPI
 * documentation metadata (`operationId`, `description`, `summary`, `tags`,
 * `security`) is not part of the runtime contract; importing
 * `@pagopa/hexagonal-openapi` augments this interface (via `declare module`)
 * to add those fields back for consumers who generate an OpenAPI document.
 */
export interface RouteContract<
  Req extends RouteRequestSchemas,
  Resp extends ResponseMap,
> {
  method: HttpMethod;
  path: string;
  request: Req;
  response: Resp;
}

/**
 * Wire-level Zod schemas for each request part. Every field is optional;
 * omitting it means "no validation / no OpenAPI parameters of that kind". Each
 * schema's output type (post-validation) is what `transformInput` receives.
 */
export interface RouteRequestSchemas {
  body?: ZodType;
  headers?: ParamObjectSchema;
  path?: ParamObjectSchema;
  query?: ParamObjectSchema;
}

/**
 * Extracts the Zod success schema from a {@link ResponseMap}, i.e. the schema
 * associated with the 2xx status key.
 */
export type SuccessSchemaFromMap<R extends ResponseMap> = SchemaOf<
  R[SuccessStatusFromMap<R>]
>;

/**
 * Extracts the success status-code key from a {@link ResponseMap}. Besides the
 * 2xx codes, the supported redirects (`301`/`302`/`303`/`307`/`308`) are
 * treated as success so the adapter can mount them as a (body-less) successful
 * outcome. The success status set is defined once in {@link SuccessStatusCode}.
 */
export type SuccessStatusFromMap<R extends ResponseMap> = Extract<
  keyof R,
  SuccessStatusCode
>;

type AllErrorResponseKeysOf<R extends ResponseMap> = Exclude<
  Extract<keyof R, number>,
  SuccessStatusCode
>;

/**
 * Extracts non-success, non-adapter-only numeric status keys from a response
 * map. These are the "pure domain-error" codes that must correspond 1-to-1 with
 * the use-case error union. Adapter-only statuses (`400`, see
 * {@link AdapterOnlyStatus}) are excluded because the adapter always handles
 * request validation regardless of what the use case declares.
 */
type ErrorResponseKeysOf<R extends ResponseMap> = Exclude<
  Extract<keyof R, number>,
  AdapterOnlyStatus | SuccessStatusCode
>;

type ErrorResponsePayloadIssue<Status extends number> = Readonly<
  Record<
    `ERROR_TS: response ${Status} schema must accept and return RFC 7807 ProblemDetails`,
    never
  >
>;

type ErrorResponsePayloadIssues<R extends ResponseMap> = {
  [Status in AllErrorResponseKeysOf<R>]: R[Status] extends RedirectEntry
    ? ErrorResponsePayloadIssue<Status>
    : SchemaOf<R[Status]> extends infer Schema
      ? Schema extends ZodType
        ? [ProblemDetailsForStatus<Status>] extends [z.input<Schema>]
          ? [z.output<Schema>] extends [ProblemDetails]
            ? never
            : ErrorResponsePayloadIssue<Status>
          : ErrorResponsePayloadIssue<Status>
        : ErrorResponsePayloadIssue<Status>
      : ErrorResponsePayloadIssue<Status>;
}[AllErrorResponseKeysOf<R>];

type ProblemDetailsForStatus<Status extends number> = Omit<
  ProblemDetails,
  "status"
> & { readonly status: Status };

type SchemaOf<E extends ResponseEntry> = E extends ZodType
  ? E
  : E extends { schema: infer S extends ZodType }
    ? S
    : never;

/**
 * Identity helper that preserves the literal types of method, path and the
 * response-map status-code keys, required for the compile-time checks performed
 * by the adapter mount functions.
 *
 * The contract is typed as {@link RouteContract} directly, so the compiler's
 * excess-property check rejects any field not declared on the interface. A team
 * that needs extra fields must extend the contract through an explicit type
 * override — e.g. the `declare module` augmentation shipped by
 * `@pagopa/hexagonal-openapi`, which adds the OpenAPI metadata. This keeps
 * contract extensions visible and prevents hidden, arbitrary property
 * injection.
 */
export const defineRoute = <
  Req extends RouteRequestSchemas,
  const Resp extends ResponseMap,
>(
  contract: RouteContract<Req, Resp>,
): RouteContract<Req, Resp> => contract;

/**
 * Type-level guard meant to be intersected into the `contract` parameter of a
 * mount function. Requires the `400` response (see {@link AdapterOnlyStatus})
 * to be declared whenever `Req` validates any part of the incoming request:
 * the adapter always emits `400` on a validation failure regardless of what
 * the use case declares, so a validating contract that omits `400` would
 * leave the declared API (and any generated OpenAPI document) inconsistent
 * with the adapter's actual runtime behavior.
 *
 * Resolves to `unknown` (a no-op) when there is nothing to validate, or when
 * `400` is already declared; otherwise resolves to
 * {@link MissingValidationErrorResponse}, which fails the intersection.
 */
export type EnsureValidationErrorDeclared<
  Req extends RouteRequestSchemas,
  Resp extends ResponseMap,
> = [HasRequestValidation<Req>] extends [true]
  ? [AdapterOnlyStatus] extends [keyof Resp]
    ? unknown
    : MissingValidationErrorResponse
  : unknown;

/**
 * True when a {@link RouteRequestSchemas} validates at least one request part
 * (body/headers/path/query). Reuses {@link WireRequest}'s own
 * `Req[K] extends ZodType` predicate — i.e. "has validation" and "produces a
 * wire key" are the same condition — so the two can never drift apart.
 */
export type HasRequestValidation<Req extends RouteRequestSchemas> =
  keyof WireRequest<Req> extends never ? false : true;

/**
 * Compile-time failure surfaced when a contract validates part of the request
 * (body/headers/path/query) but its response map omits the `400` entry — the
 * status the adapter always emits for validation failures (see
 * {@link AdapterOnlyStatus}). The property name doubles as the compiler
 * diagnostic: intersecting this into the `contract` parameter turns a missing
 * `400` into a "missing property" error that names the fix.
 */
export interface MissingValidationErrorResponse {
  readonly "add a 400 (ValidationError) response entry to this contract": never;
}

/** Convenience: the type the use case must return for a given contract. */
export type UseCaseOutputOf<
  C extends RouteContract<RouteRequestSchemas, ResponseMap>,
> =
  C extends RouteContract<RouteRequestSchemas, infer R>
    ? z.input<SuccessSchemaFromMap<R>>
    : never;

/**
 * Type-level shape of the validated request, given a {@link RouteRequestSchemas}.
 * Only the keys whose schema was provided are present.
 */
export type WireRequest<Req extends RouteRequestSchemas> = {
  [K in keyof Req as Req[K] extends ZodType ? K : never]: Req[K] extends ZodType
    ? z.output<Req[K]>
    : never;
};

/** Convenience: the wire request type for a given contract. */
export type WireRequestOf<
  C extends RouteContract<RouteRequestSchemas, ResponseMap>,
> = C extends RouteContract<infer R, ResponseMap> ? WireRequest<R> : never;
