import type { BaseError } from "@pagopa/hexagonal-core/domain/errors";
import type { FastifyReply } from "fastify";

import { mapErrorToHttpResponse } from "@pagopa/hexagonal-core/adapters";

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
