import type { HttpRequestPayload } from "@pagopa/hexagonal-core/adapters";
import type { InputValidator } from "@pagopa/hexagonal-core/domain/ports";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { FastifyRequest } from "fastify";

import { createHttpRequestValidator } from "@pagopa/hexagonal-core/adapters";

/**
 * Maps a native Fastify request onto the canonical
 * {@link HttpRequestPayload} consumed by the framework-agnostic validator.
 *
 * `path` is sourced from Fastify's `request.params`; an absent body is
 * normalized to `{}` so body-less requests validate against an empty object.
 *
 * @param request The incoming Fastify request.
 * @returns The request decomposed into `body` / `headers` / `path` / `query`.
 */
export const fastifyExtractPayload = (
  request: FastifyRequest
): HttpRequestPayload => ({
  body: request.body ?? {},
  headers: request.headers,
  path: request.params,
  query: request.query,
});

/**
 * Builds a Fastify {@link InputValidator} from a Standard Schema by binding the
 * core validator to {@link fastifyExtractPayload}.
 *
 * The schema may only describe `body` / `headers` / `path` / `query`; any other
 * top-level key is rejected at compile time by the core validator's guard.
 *
 * @typeParam T The Standard Schema describing the request payload.
 * @param schema Schema validating `body` / `headers` / `path` / `query`.
 * @returns An InputValidator from a `FastifyRequest` to the schema output.
 */
export const createFastifyRequestValidator = <
  T extends StandardSchemaV1<unknown, unknown>
>(
  schema: Parameters<typeof createHttpRequestValidator<FastifyRequest, T>>[0]
): InputValidator<FastifyRequest, StandardSchemaV1.InferOutput<T>> =>
  createHttpRequestValidator<FastifyRequest, T>(schema, fastifyExtractPayload);

export { emptyValidator } from "@pagopa/hexagonal-core/adapters";
export type { HttpRequestPayload } from "@pagopa/hexagonal-core/adapters";
