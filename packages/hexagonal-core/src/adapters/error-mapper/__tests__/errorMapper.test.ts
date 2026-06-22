import { describe, expect, it } from "vitest";

import {
  BaseError,
  ConflictError,
  ForbiddenError,
  GenericError,
  NotFoundError,
  PreconditionFailedError,
  ValidationError,
} from "../../../domain/errors/index.js";
import {
  mapErrorToHttpResponse,
  mapErrorToProblemDetails,
} from "../errorMapper.js";

describe("mapErrorToProblemDetails", () => {
  it("maps ValidationError to 400 under the default problems domain", () => {
    const result = mapErrorToProblemDetails()(
      new ValidationError("Invalid input")
    );

    expect(result.status).toBe(400);
    expect(result.title).toBe("Validation Error");
    expect(result.type).toBe(
      "https://example.pagopa.it/problems/validation-error"
    );
    expect(result.detail).toContain("Invalid input");
  });

  it("maps NotFoundError to 404", () => {
    const result = mapErrorToProblemDetails()(
      new NotFoundError("User", "id-123")
    );

    expect(result.status).toBe(404);
    expect(result.title).toBe("Not Found");
    expect(result.type).toBe("https://example.pagopa.it/problems/not-found");
    expect(result.detail).toContain("Unable to find User");
  });

  it("maps ForbiddenError to 403", () => {
    const result = mapErrorToProblemDetails()(new ForbiddenError());

    expect(result.status).toBe(403);
    expect(result.title).toBe("Forbidden");
    expect(result.type).toBe("https://example.pagopa.it/problems/forbidden");
  });

  it("maps ConflictError to 409", () => {
    const result = mapErrorToProblemDetails()(
      new ConflictError("Resource already exists")
    );

    expect(result.status).toBe(409);
    expect(result.title).toBe("Conflict");
    expect(result.type).toBe("https://example.pagopa.it/problems/conflict");
  });

  it("maps PreconditionFailedError to 412", () => {
    const result = mapErrorToProblemDetails()(
      new PreconditionFailedError("Version mismatch")
    );

    expect(result.status).toBe(412);
    expect(result.title).toBe("Precondition Failed");
    expect(result.type).toBe(
      "https://example.pagopa.it/problems/precondition-failed"
    );
    expect(result.detail).toContain("Version mismatch");
  });

  it("maps GenericError to 500", () => {
    const result = mapErrorToProblemDetails()(
      new GenericError("Database connection failed")
    );

    expect(result.status).toBe(500);
    expect(result.title).toBe("Internal Server Error");
    expect(result.type).toBe(
      "https://example.pagopa.it/problems/generic-error"
    );
  });

  it("uses a custom TYPE_BASE_URL when provided", () => {
    const result = mapErrorToProblemDetails({
      typeBaseUrl: "https://ioapp.it/problems/",
    })(new ValidationError("Invalid input"));

    expect(result.type).toBe("https://ioapp.it/problems/validation-error");
  });

  it("uses the custom `tag` of a subclass for the problem type", () => {
    class CustomValidationError extends ValidationError {
      override readonly tag = "custom-validation" as const;
    }

    const result = mapErrorToProblemDetails()(
      new CustomValidationError("Custom input")
    );

    expect(result.status).toBe(400);
    expect(result.type).toBe(
      "https://example.pagopa.it/problems/custom-validation"
    );
  });

  it("falls back to 500 for unknown error kinds", () => {
    class CustomError extends BaseError {
      override readonly kind = "CustomError" as const;
      constructor() {
        super("custom");
      }
    }

    const result = mapErrorToProblemDetails()(new CustomError());

    expect(result.status).toBe(500);
    expect(result.title).toBe("Internal Server Error");
    expect(result.type).toBe("https://example.pagopa.it/problems/base-error");
  });
});

describe("mapErrorToHttpResponse", () => {
  it("returns a Problem+JSON response with the expected shape", () => {
    const response = mapErrorToHttpResponse()(
      new ValidationError("Invalid data")
    );

    expect(response.status).toBe(400);
    expect(response.headers).toEqual({
      "content-type": "application/problem+json",
    });
    expect(response.jsonBody).toHaveProperty("type");
    expect(response.jsonBody).toHaveProperty("title");
    expect(response.jsonBody).toHaveProperty("status");
    expect(response.jsonBody).toHaveProperty("detail");
    expect(response.jsonBody).not.toHaveProperty("instance");
  });

  it("maps NotFound to a 404 response", () => {
    const response = mapErrorToHttpResponse()(
      new NotFoundError("User", "user-id")
    );

    expect(response.status).toBe(404);
    expect(response.jsonBody.status).toBe(404);
  });

  it("maps Conflict to a 409 response", () => {
    const response = mapErrorToHttpResponse()(
      new ConflictError("Duplicate entry")
    );

    expect(response.status).toBe(409);
    expect(response.jsonBody.status).toBe(409);
  });

  it("maps PreconditionFailed to a 412 response", () => {
    const response = mapErrorToHttpResponse()(
      new PreconditionFailedError("ETag mismatch")
    );

    expect(response.status).toBe(412);
    expect(response.jsonBody.status).toBe(412);
  });
});
