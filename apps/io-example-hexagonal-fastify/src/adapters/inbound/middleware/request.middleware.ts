import type {
  EmptyHttpMiddlewareContext,
  HttpRequestMiddleware,
} from "@pagopa/hexagonal-core/adapters";
import type { EmailAddress } from "@pagopa/hexagonal-core/domain/value-objects";

import { AuthenticationError } from "@pagopa/hexagonal-core/domain/errors";
import { err, ok } from "neverthrow";

import type { CallerId } from "../../../domain/value-objects/caller-id.value-object.js";
import type { ClientIp } from "../../../domain/value-objects/client-ip.value-object.js";

import { ClientIpSchema } from "../../../domain/value-objects/client-ip.value-object.js";
import {
  AuthorizationHeadersSchema,
  CallerHeadersSchema,
  ClientIpHeadersSchema,
} from "../dto/middleware-headers.dto.js";

/** Context added after the request has passed the authentication stage. */
export interface AuthenticationContext {
  readonly authenticated: true;
}

/** Context added after gateway caller attributes have been resolved. */
export interface CallerContext {
  readonly caller: {
    readonly email: EmailAddress;
    readonly id: CallerId;
  };
}

/** Context added after the forwarded client IP has been extracted. */
export interface ClientIpContext {
  readonly clientIp?: ClientIp;
}

/**
 * Authenticates a request when the canonical payload contains a non-empty
 * authorization header. The credential itself is deliberately not propagated
 * to the application layer.
 */
export const authenticateRequest: HttpRequestMiddleware<
  EmptyHttpMiddlewareContext,
  AuthenticationContext,
  AuthenticationError
> = async ({ payload }) => {
  const result = AuthorizationHeadersSchema.safeParse(payload.headers);

  return result.success
    ? ok({ authenticated: true })
    : err(new AuthenticationError());
};

/**
 * Extracts the first address from `x-forwarded-for` after authentication.
 * Missing or malformed forwarding data is represented as an absent optional
 * context value, matching the nullable client-IP concern in the source chain.
 */
export const extractClientIp: HttpRequestMiddleware<
  AuthenticationContext,
  ClientIpContext,
  never
> = async ({ payload }) => {
  const result = ClientIpHeadersSchema.safeParse(payload.headers);
  const firstForwardedAddress = result.success
    ? result.data["x-forwarded-for"]
        ?.split(",")
        .map((value) => value.trim())
        .find((value) => value.length > 0)
    : undefined;
  const clientIp = ClientIpSchema.safeParse(firstForwardedAddress);

  return ok({
    clientIp: clientIp.success ? clientIp.data : undefined,
  });
};

/**
 * Resolves the caller attributes added by an API gateway. It requires both
 * previous stages, then returns a transport-neutral caller context or 401 when
 * the authentication marker or gateway headers are unavailable.
 */
export const resolveCallerAttributes: HttpRequestMiddleware<
  AuthenticationContext & ClientIpContext,
  CallerContext,
  AuthenticationError
> = async ({ context, payload }) => {
  if (context.authenticated !== true) {
    return err(new AuthenticationError());
  }

  const result = CallerHeadersSchema.safeParse(payload.headers);

  return result.success
    ? ok({
        caller: {
          email: result.data["x-user-email"],
          id: result.data["x-user-id"],
        },
      })
    : err(new AuthenticationError());
};
