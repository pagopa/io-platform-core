import type { StandardSchemaV1 } from "@standard-schema/spec";

import { err, ok } from "neverthrow";

import type { InputValidator } from "../../domain/ports/inbound/index.js";

import { ValidationError } from "../../domain/errors/index.js";

/**
 * Canonical decomposition of an HTTP request into the parts a request schema may
 * read. Framework adapters map their native request object onto this shape.
 */
export interface HttpRequestPayload {
  body?: unknown;
  headers?: unknown;
  path?: unknown;
  query?: unknown;
}

/**
 * Compile-time guard: a request schema may only describe `body`, `headers`,
 * `path` or `query`. Any other top-level key resolves the type to a descriptive
 * error string, turning the misuse into a TypeScript error at the call site.
 */
type RestrictToPayloadKeys<T extends StandardSchemaV1<unknown, unknown>> =
  Exclude<
    keyof StandardSchemaV1.InferInput<T>,
    keyof HttpRequestPayload
  > extends never
    ? unknown
    : "ERROR_TS:schema contains invalid parameters (use only body, headers, path or query)";

/**
 * Builds a framework-agnostic {@link InputValidator} from a Standard Schema.
 *
 * Because the core package must not depend on any web framework, the caller
 * provides an `extractPayload` function that maps the framework's native request
 * object (`TRequest`) into the canonical {@link HttpRequestPayload}. Each
 * framework adapter (fastify, azure-functions, …) supplies its own extractor.
 *
 * @typeParam TRequest The framework request type (e.g. `FastifyRequest`).
 * @typeParam T The Standard Schema describing a subset of the payload.
 * @param schema Schema validating `body`/`headers`/`path`/`query`.
 * @param extractPayload Maps the raw request into an {@link HttpRequestPayload}.
 * @returns An InputValidator yielding the schema output or a {@link ValidationError}.
 */
export const createHttpRequestValidator =
  <TRequest, T extends StandardSchemaV1<unknown, unknown>>(
    schema: RestrictToPayloadKeys<T> & T,
    extractPayload: (request: TRequest) => HttpRequestPayload
  ): InputValidator<TRequest, StandardSchemaV1.InferOutput<T>> =>
  async (request: TRequest) => {
    const result = await schema["~standard"].validate(extractPayload(request));

    if (result.issues) {
      return err(validationErrorFromStandardIssues(result.issues));
    }

    return ok(result.value);
  };

/**
 * Wraps an array of Standard Schema issues into a single {@link ValidationError}.
 *
 * @param input The issues reported by the schema validation.
 * @returns A ValidationError whose message lists every issue.
 */
export const validationErrorFromStandardIssues = (
  input: readonly StandardSchemaV1.Issue[]
): ValidationError => new ValidationError(formatStandardIssues(input));

/**
 * Formats Standard Schema issues into a single human-readable string such as
 * `"[body.id]: Required, [query.page]: Expected number"`.
 *
 * @param issues The issues reported by the schema validation.
 * @returns A comma-separated, path-annotated description of every issue.
 */
const formatStandardIssues = (
  issues: readonly StandardSchemaV1.Issue[]
): string =>
  issues
    .map((issue) => {
      // When present, join the path keys (e.g. "body.id"); otherwise "root".
      const pathString = issue.path ? issue.path.join(".") : "root";

      return `[${pathString}]: ${issue.message}`;
    })
    .join(", ");

/**
 * An {@link InputValidator} that ignores the request and yields an empty object.
 * Useful for endpoints that take no input.
 */
export const emptyValidator: InputValidator<
  unknown,
  Record<string, never>
> = async () => ok({});
