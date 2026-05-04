import {
  BaseError,
  ConflictError,
  ForbiddenError,
  GenericError,
  NotFoundError,
  PreconditionFailedError,
  ValidationError,
} from "@pagopa/io-core-domain/errors";
import { describe, expect, it } from "vitest";

import { mapErrorToProblemDetails } from "../errorMapper.js";

describe("mapErrorToProblemDetails", () => {
  it("should map ValidationError to 400 with ioapp.it/problems domain", () => {
    const error = new ValidationError("Invalid input");
    const result = mapErrorToProblemDetails(error);

    expect(result.status).toBe(400);
    expect(result.title).toBe("Validation Error");
    expect(result.type).toBe("https://ioapp.it/problems/validation-error");
    expect(result.detail).toContain("Invalid input");
  });

  it("should map NotFoundError to 404 with ioapp.it/problems domain", () => {
    const error = new NotFoundError("User", "id-123");
    const result = mapErrorToProblemDetails(error);

    expect(result.status).toBe(404);
    expect(result.title).toBe("Not Found");
    expect(result.type).toBe("https://ioapp.it/problems/not-found");
    expect(result.detail).toContain("Unable to find User");
  });

  it("should map ForbiddenError to 403 with ioapp.it/problems domain", () => {
    const error = new ForbiddenError();
    const result = mapErrorToProblemDetails(error);

    expect(result.status).toBe(403);
    expect(result.title).toBe("Forbidden");
    expect(result.type).toBe("https://ioapp.it/problems/forbidden");
  });

  it("should map ConflictError to 409 with ioapp.it/problems domain", () => {
    const error = new ConflictError("Resource already exists");
    const result = mapErrorToProblemDetails(error);

    expect(result.status).toBe(409);
    expect(result.title).toBe("Conflict");
    expect(result.type).toBe("https://ioapp.it/problems/conflict");
  });

  it("should map PreconditionFailedError to 412 with ioapp.it/problems domain", () => {
    const error = new PreconditionFailedError("Version mismatch");
    const result = mapErrorToProblemDetails(error);

    expect(result.status).toBe(412);
    expect(result.title).toBe("Precondition Failed");
    expect(result.type).toBe("https://ioapp.it/problems/precondition-failed");
    expect(result.detail).toContain("Version mismatch");
  });

  it("should map GenericError to 500 with ioapp.it/problems domain", () => {
    const error = new GenericError("Database connection failed");
    const result = mapErrorToProblemDetails(error);

    expect(result.status).toBe(500);
    expect(result.title).toBe("Internal Server Error");
    expect(result.type).toBe("https://ioapp.it/problems/generic-error");
  });

  it("should use custom type when a Subclass provides it", () => {
    class CustomValidationError extends ValidationError {
      override readonly tag = "custom-validation" as const;
    }

    const error = new CustomValidationError("Custom input");
    const result = mapErrorToProblemDetails(error);

    expect(result.status).toBe(400);
    expect(result.type).toBe("https://ioapp.it/problems/custom-validation");
  });

  it("should fallback to 500 for unknown error kinds", () => {
    class CustomError extends BaseError {
      override readonly kind = "CustomError" as const;
      constructor() {
        super("custom");
      }
    }

    const error = new CustomError();
    const result = mapErrorToProblemDetails(error);

    expect(result.status).toBe(500);
    expect(result.title).toBe("Internal Server Error");
    expect(result.type).toBe("https://ioapp.it/problems/base-error");
  });
});
