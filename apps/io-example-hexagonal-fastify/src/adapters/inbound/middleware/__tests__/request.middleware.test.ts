import { AuthenticationError } from "@pagopa/hexagonal-core/domain/errors";
import { describe, expect, it } from "vitest";

import { ClientIpSchema } from "../../../../domain/value-objects/client-ip.value-object.js";
import {
  authenticateRequest,
  extractClientIp,
  resolveCallerAttributes,
} from "../request.middleware.js";

describe("request middleware examples", () => {
  const clientIp = ClientIpSchema.parse("203.0.113.10");

  it("rejects a request without authorization", async () => {
    const result = await authenticateRequest({
      context: {},
      payload: {},
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(AuthenticationError);
  });

  it("adds an authentication marker without exposing the credential", async () => {
    const result = await authenticateRequest({
      context: {},
      payload: { headers: { authorization: "Bearer token" } },
    });

    expect(result._unsafeUnwrap()).toEqual({ authenticated: true });
  });

  it("extracts the first forwarded client IP", async () => {
    const result = await extractClientIp({
      context: { authenticated: true },
      payload: { headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" } },
    });

    expect(result._unsafeUnwrap()).toEqual({ clientIp: "203.0.113.10" });
  });

  it("keeps client IP optional", async () => {
    const result = await extractClientIp({
      context: { authenticated: true },
      payload: {},
    });

    expect(result._unsafeUnwrap()).toEqual({ clientIp: undefined });
  });

  it("resolves caller attributes after authentication and IP extraction", async () => {
    const result = await resolveCallerAttributes({
      context: { authenticated: true, clientIp },
      payload: {
        headers: {
          "x-user-email": "User@Example.COM",
          "x-user-id": "user-1",
        },
      },
    });

    expect(result._unsafeUnwrap()).toEqual({
      caller: { email: "user@example.com", id: "user-1" },
    });
  });

  it("rejects missing caller attributes", async () => {
    const result = await resolveCallerAttributes({
      context: { authenticated: true, clientIp },
      payload: {},
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(AuthenticationError);
  });
});
