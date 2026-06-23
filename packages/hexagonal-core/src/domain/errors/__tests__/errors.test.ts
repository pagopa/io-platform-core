import { describe, expect, it } from "vitest";

import {
  AuthenticationError,
  BadGatewayError,
  BaseError,
  ConflictError,
  ForbiddenError,
  GatewayTimeoutError,
  GenericError,
  GoneError,
  NotFoundError,
  PreconditionFailedError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnprocessableEntityError,
  ValidationError,
} from "../index.js";

describe("domain errors", () => {
  it("AuthenticationError → 'AuthenticationError' / 'authentication-error'", () => {
    const e = new AuthenticationError();
    expect(e).toBeInstanceOf(BaseError);
    expect(e).toBeInstanceOf(Error);
    expect(e.kind).toBe("AuthenticationError");
    expect(e.tag).toBe("authentication-error");
    expect(e.message).toContain("authentication required");
  });

  it("ConflictError wraps the detail message", () => {
    const e = new ConflictError("already exists");
    expect(e.kind).toBe("ConflictError");
    expect(e.tag).toBe("conflict");
    expect(e.message).toBe("Conflict: already exists");
  });

  it("ForbiddenError → 'ForbiddenError' / 'forbidden'", () => {
    const e = new ForbiddenError();
    expect(e.kind).toBe("ForbiddenError");
    expect(e.tag).toBe("forbidden");
    expect(e.message).toContain("permission");
  });

  it("GenericError wraps the detail message", () => {
    const e = new GenericError("boom");
    expect(e.kind).toBe("GenericError");
    expect(e.tag).toBe("generic-error");
    expect(e.message).toBe("Generic error: boom");
  });

  it("NotFoundError exposes entityName and a descriptive message", () => {
    const e = new NotFoundError("User", "id-123");
    expect(e.kind).toBe("NotFoundError");
    expect(e.tag).toBe("not-found");
    expect(e.entityName).toBe("User");
    expect(e.message).toBe("Unable to find User: id-123");
  });

  it("PreconditionFailedError wraps the detail message", () => {
    const e = new PreconditionFailedError("version mismatch");
    expect(e.kind).toBe("PreconditionFailedError");
    expect(e.tag).toBe("precondition-failed");
    expect(e.message).toBe("Precondition failed: version mismatch");
  });

  it("UnprocessableEntityError wraps the detail message", () => {
    const e = new UnprocessableEntityError("cannot process");
    expect(e.kind).toBe("UnprocessableEntityError");
    expect(e.tag).toBe("unprocessable-entity");
    expect(e.message).toBe("Unprocessable entity: cannot process");
  });

  it("ValidationError wraps the detail message", () => {
    const e = new ValidationError("bad field");
    expect(e.kind).toBe("ValidationError");
    expect(e.tag).toBe("validation-error");
    expect(e.message).toBe("Validation error: bad field");
  });

  it("GoneError wraps the detail message", () => {
    const e = new GoneError("resource deleted");
    expect(e).toBeInstanceOf(BaseError);
    expect(e.kind).toBe("GoneError");
    expect(e.tag).toBe("gone");
    expect(e.message).toBe("Gone: resource deleted");
  });

  it("TooManyRequestsError has a fixed message", () => {
    const e = new TooManyRequestsError();
    expect(e).toBeInstanceOf(BaseError);
    expect(e.kind).toBe("TooManyRequestsError");
    expect(e.tag).toBe("too-many-requests");
    expect(e.message).toBe("Too many requests");
  });

  it("BadGatewayError wraps the detail message", () => {
    const e = new BadGatewayError("upstream returned 503");
    expect(e).toBeInstanceOf(BaseError);
    expect(e.kind).toBe("BadGatewayError");
    expect(e.tag).toBe("bad-gateway");
    expect(e.message).toBe("Bad gateway: upstream returned 503");
  });

  it("ServiceUnavailableError wraps the detail message", () => {
    const e = new ServiceUnavailableError("under maintenance");
    expect(e).toBeInstanceOf(BaseError);
    expect(e.kind).toBe("ServiceUnavailableError");
    expect(e.tag).toBe("service-unavailable");
    expect(e.message).toBe("Service unavailable: under maintenance");
  });

  it("GatewayTimeoutError wraps the detail message", () => {
    const e = new GatewayTimeoutError("upstream timed out after 30s");
    expect(e).toBeInstanceOf(BaseError);
    expect(e.kind).toBe("GatewayTimeoutError");
    expect(e.tag).toBe("gateway-timeout");
    expect(e.message).toBe("Gateway timeout: upstream timed out after 30s");
  });

  it("every concrete error is an instance of BaseError", () => {
    const errors = [
      new AuthenticationError(),
      new BadGatewayError("x"),
      new ConflictError("x"),
      new ForbiddenError(),
      new GatewayTimeoutError("x"),
      new GenericError("x"),
      new GoneError("x"),
      new NotFoundError("E", "x"),
      new PreconditionFailedError("x"),
      new ServiceUnavailableError("x"),
      new TooManyRequestsError(),
      new UnprocessableEntityError("x"),
      new ValidationError("x"),
    ];

    for (const e of errors) {
      expect(e).toBeInstanceOf(BaseError);
    }
  });
});
