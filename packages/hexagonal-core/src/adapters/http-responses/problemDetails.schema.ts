import { z } from "zod";

/**
 * RFC 7807 "Problem Details" response body, expressed as a Zod schema.
 *
 * This is the canonical, framework-agnostic shape every HTTP adapter uses for
 * error responses. It is a plain Zod v4 schema with **no** `zod-to-openapi`
 * dependency: the `.meta({ id })` annotation is native Zod metadata, which the
 * code-first OpenAPI generator (`@pagopa/hexagonal-openapi`) reads to register
 * the schema as the reusable `#/components/schemas/ProblemDetails` component.
 *
 * The inferred output type is kept structurally compatible with the
 * `ProblemDetails` interface produced by the core error mapper, so the two
 * representations never drift (guaranteed by a compile-time test).
 *
 * @see https://www.rfc-editor.org/rfc/rfc7807
 */
export const ProblemDetailsSchema = z
  .object({
    /** Human-readable explanation specific to this occurrence of the problem. */
    detail: z.string(),
    /** HTTP status code. */
    status: z.int(),
    /** Short, human-readable summary of the problem type. */
    title: z.string(),
    /** URI reference identifying the problem type. */
    type: z.url(),
  })
  .meta({
    description:
      "RFC 7807 Problem Details for HTTP APIs. See https://www.rfc-editor.org/rfc/rfc7807.",
    id: "ProblemDetails",
  });

/**
 * Convenience alias for {@link ProblemDetailsSchema}. Use it as the schema for
 * error responses in route-contract `response` maps.
 *
 * @example
 * ```ts
 * response: {
 *   200: UserResponseSchema,
 *   404: ProblemJson,
 * }
 * ```
 */
export const ProblemJson = ProblemDetailsSchema;
