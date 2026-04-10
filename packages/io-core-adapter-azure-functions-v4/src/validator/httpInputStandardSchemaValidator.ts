import type { StandardSchemaV1 } from "@standard-schema/spec";

import { HttpRequest } from "@azure/functions";
import { InputValidator } from "@pagopa/io-core-domain";
import { ValidationError } from "@pagopa/io-core-domain/errors";
import { err, ok } from "neverthrow";

export interface HttpRequestPayload {
  body?: unknown;
  headers?: unknown;
  path?: unknown;
  query?: unknown;
}

type RestrictToPayloadKeys<T extends StandardSchemaV1<any, any>> =
  Exclude<keyof SchemaInput<T>, keyof HttpRequestPayload> extends never
    ? unknown
    : "ERROR_TS:schema contains invalid parameters (use only body, headers, path or query)";

type SchemaInput<T extends StandardSchemaV1<any, any>> =
  StandardSchemaV1.InferInput<T>;

/**
 *
 * @param schema
 * @returns
 */
export const createHttpRequestValidator =
  <T extends StandardSchemaV1<any, any>>(
    schema: RestrictToPayloadKeys<T> & T,
  ): InputValidator<HttpRequest, StandardSchemaV1.InferOutput<T>> =>
  async (request: HttpRequest) => {
    let parsedBody: unknown = {};
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        parsedBody = await request.json();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        // If parsing fails, we pass an empty object.
        // Zod will trigger the error if the body was required.
      }
    }

    const inputForSchemaValidator = {
      body: parsedBody,
      headers: Object.fromEntries(request.headers.entries()),
      path: request.params,
      query: Object.fromEntries(request.query.entries()),
    };

    const result = await schema["~standard"].validate(inputForSchemaValidator);

    if (result.issues) {
      return err(validationErrorFromStandardIssues(result.issues));
    }

    return ok(result.value);
  };

export const validationErrorFromStandardIssues = (
  input: readonly StandardSchemaV1.Issue[],
): ValidationError => new ValidationError(formatStandardIssues(input));

/**
 * Converts the array of Standard Schema errors into a single formatted string.
 */
const formatStandardIssues = (
  issues: readonly StandardSchemaV1.Issue[],
): string =>
  issues
    .map((issue) => {
      // If there's a path, join the keys (e.g., "body.id")
      const pathString = issue.path ? issue.path.join(".") : "root";

      return `[${pathString}]: ${issue.message}`;
    })
    .join(", ");

/**
 *
 * @returns
 */
export const emptyValidator: InputValidator<
  HttpRequest,
  Record<string, never>
> = async () => ok({});
