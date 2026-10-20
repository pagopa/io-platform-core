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

// eslint-disable-next-line max-lines-per-function
describe("domain errors", () => {
  it.each([
    {
      error: new AuthenticationError(),
      expectedMessage: "Unauthorized: authentication required",
      kind: "AuthenticationError",
      tag: "authentication-error",
    },
    {
      error: new BadGatewayError(),
      expectedMessage: "Bad gateway: invalid response from upstream",
      kind: "BadGatewayError",
      tag: "bad-gateway",
    },
    {
      error: new ConflictError(),
      expectedMessage: "Conflict: resource conflict",
      kind: "ConflictError",
      tag: "conflict",
    },
    {
      error: new ForbiddenError(),
      expectedMessage:
        "Forbidden: you don't have permission to access this resource",
      kind: "ForbiddenError",
      tag: "forbidden",
    },
    {
      error: new GatewayTimeoutError(),
      expectedMessage: "Gateway timeout: upstream did not respond in time",
      kind: "GatewayTimeoutError",
      tag: "gateway-timeout",
    },
    {
      error: new GenericError(),
      expectedMessage: "Generic error: an unexpected error occurred",
      kind: "GenericError",
      tag: "generic-error",
    },
    {
      error: new GoneError(),
      expectedMessage: "Gone: resource no longer exists",
      kind: "GoneError",
      tag: "gone",
    },
    {
      error: new NotFoundError("User"),
      expectedMessage: "Unable to find User: not found",
      kind: "NotFoundError",
      tag: "not-found",
    },
    {
      error: new PreconditionFailedError(),
      expectedMessage: "Precondition failed: precondition not met",
      kind: "PreconditionFailedError",
      tag: "precondition-failed",
    },
    {
      error: new ServiceUnavailableError(),
      expectedMessage: "Service unavailable: service temporarily unavailable",
      kind: "ServiceUnavailableError",
      tag: "service-unavailable",
    },
    {
      error: new TooManyRequestsError(),
      expectedMessage: "Too many requests: rate limit exceeded",
      kind: "TooManyRequestsError",
      tag: "too-many-requests",
    },
    {
      error: new UnprocessableEntityError(),
      expectedMessage: "Unprocessable entity: unable to process request",
      kind: "UnprocessableEntityError",
      tag: "unprocessable-entity",
    },
    {
      error: new ValidationError(),
      expectedMessage: "Validation error: validation failed",
      kind: "ValidationError",
      tag: "validation-error",
    },
  ])(
    "$kind sets default kind, tag, and message",
    ({ error, expectedMessage, kind, tag }) => {
      expect(error.kind).toBe(kind);
      expect(error.tag).toBe(tag);
      expect(error.message).toBe(expectedMessage);
    },
  );

  it.each([
    {
      error: new AuthenticationError("custom detail"),
      expectedMessage: "Unauthorized: custom detail",
      kind: "AuthenticationError",
      tag: "authentication-error",
    },
    {
      error: new BadGatewayError("custom detail"),
      expectedMessage: "Bad gateway: custom detail",
      kind: "BadGatewayError",
      tag: "bad-gateway",
    },
    {
      error: new ConflictError("custom detail"),
      expectedMessage: "Conflict: custom detail",
      kind: "ConflictError",
      tag: "conflict",
    },
    {
      error: new ForbiddenError("custom detail"),
      expectedMessage: "Forbidden: custom detail",
      kind: "ForbiddenError",
      tag: "forbidden",
    },
    {
      error: new GatewayTimeoutError("custom detail"),
      expectedMessage: "Gateway timeout: custom detail",
      kind: "GatewayTimeoutError",
      tag: "gateway-timeout",
    },
    {
      error: new GenericError("custom detail"),
      expectedMessage: "Generic error: custom detail",
      kind: "GenericError",
      tag: "generic-error",
    },
    {
      error: new GoneError("custom detail"),
      expectedMessage: "Gone: custom detail",
      kind: "GoneError",
      tag: "gone",
    },
    {
      error: new NotFoundError("User", "custom detail"),
      expectedMessage: "Unable to find User: custom detail",
      kind: "NotFoundError",
      tag: "not-found",
    },
    {
      error: new PreconditionFailedError("custom detail"),
      expectedMessage: "Precondition failed: custom detail",
      kind: "PreconditionFailedError",
      tag: "precondition-failed",
    },
    {
      error: new ServiceUnavailableError("custom detail"),
      expectedMessage: "Service unavailable: custom detail",
      kind: "ServiceUnavailableError",
      tag: "service-unavailable",
    },
    {
      error: new TooManyRequestsError("custom detail"),
      expectedMessage: "Too many requests: custom detail",
      kind: "TooManyRequestsError",
      tag: "too-many-requests",
    },
    {
      error: new UnprocessableEntityError("custom detail"),
      expectedMessage: "Unprocessable entity: custom detail",
      kind: "UnprocessableEntityError",
      tag: "unprocessable-entity",
    },
    {
      error: new ValidationError("custom detail"),
      expectedMessage: "Validation error: custom detail",
      kind: "ValidationError",
      tag: "validation-error",
    },
  ])(
    "$kind wraps the custom message",
    ({ error, expectedMessage, kind, tag }) => {
      expect(error.message).toBe(expectedMessage);
      expect(error.kind).toBe(kind);
      expect(error.tag).toBe(tag);
    },
  );

  it("every concrete error is an instance of BaseError", () => {
    const errors = [
      new AuthenticationError(),
      new BadGatewayError(),
      new ConflictError(),
      new ForbiddenError(),
      new GatewayTimeoutError(),
      new GenericError(),
      new GoneError(),
      new NotFoundError("E"),
      new PreconditionFailedError(),
      new ServiceUnavailableError(),
      new TooManyRequestsError(),
      new UnprocessableEntityError(),
      new ValidationError(),
    ];

    for (const e of errors) {
      expect(e).toBeInstanceOf(BaseError);
    }
  });
});
