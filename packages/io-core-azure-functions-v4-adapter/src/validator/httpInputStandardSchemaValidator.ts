import type { StandardSchemaV1 } from "@standard-schema/spec";

import { HttpRequest } from "@azure/functions";
import { InputValidator } from "@pagopa/io-core-domain";
import { ValidationError } from "@pagopa/io-core-domain/errors";
import { err, ok } from "neverthrow";

export interface HttpRequestPayload {
  body?: unknown;
  headers?: unknown;
  params?: unknown;
  query?: unknown;
}

/**
 *
 * @returns
 */
export const emptyValidator: InputValidator<
  HttpRequest,
  Record<string, never>
> = async () => ok({});

/**
 *
 * @param schema
 * @returns
 */
export const createRequestValidator =
  <O, T extends StandardSchemaV1<HttpRequestPayload, O>>(
    schema: T,
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

    const inputForZod = {
      body: parsedBody,
      headers: request.headers,
      params: request.params,
      query: request.query,
    };

    const result = await schema["~standard"].validate(inputForZod);

    if (result.issues) {
      return err(validationErrorFromZodError(result.issues));
    }

    return ok(result.value);
  };

export const validationErrorFromZodError = (
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
