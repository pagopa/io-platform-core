import type { BaseError } from "@pagopa/hexagonal-core/domain/errors";
import type { FastifyReply } from "fastify";

import {
  mapErrorToHttpResponse,
  mapErrorToHttpResponseAgainstContract,
  type ResponseMap,
} from "@pagopa/hexagonal-core/adapters";

/** Optional configuration forwarded to the core error mapper. */
export type ErrorResponderConfig = Parameters<typeof mapErrorToHttpResponse>[0];

/**
 * Sends a domain {@link BaseError} as an RFC 7807 `application/problem+json`
 * response on a Fastify reply.
 *
 * The status, headers and body are produced by the core
 * {@link mapErrorToHttpResponse} mapper — this adapter only writes them onto the
 * reply, so the error-to-HTTP mapping is never re-implemented here.
 *
 * @param reply The Fastify reply to write to.
 * @param error The domain error to translate.
 * @param config Optional error-mapper configuration (e.g. `typeBaseUrl`).
 * @returns The same Fastify reply, after the response has been sent.
 */
export const sendErrorResponse = (
  reply: FastifyReply,
  error: BaseError,
  config?: ErrorResponderConfig,
): FastifyReply => {
  const { headers, jsonBody, status } = mapErrorToHttpResponse(config)(error);

  return reply.status(status).headers(headers).send(jsonBody);
};

/**
 * Maps and validates an error against a mounted route's response map before
 * writing it to Fastify. A contract mismatch falls back to a raw 500 response
 * so a malformed declared error schema cannot trigger recursive error handling.
 */
export const sendContractErrorResponse = async (
  reply: FastifyReply,
  error: BaseError,
  responseMap: ResponseMap,
  config?: ErrorResponderConfig,
): Promise<FastifyReply> => {
  const result = await mapErrorToHttpResponseAgainstContract(
    error,
    responseMap,
    config,
  );

  if (result.isErr()) {
    return sendErrorResponse(reply, result.error, config);
  }

  const { headers, jsonBody, status } = result.value;
  return reply.status(status).headers(headers).send(jsonBody);
};
