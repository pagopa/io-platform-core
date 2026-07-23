import { describe, expect, it } from "vitest";
import { z } from "zod";

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
  ValidationError,
} from "../../../domain/errors/index.js";
import { ProblemJson } from "../../http-responses/problemDetails.schema.js";
import {
  mapErrorToHttpResponse,
  mapErrorToProblemDetails,
} from "../errorMapper.js";
import { validateHttpErrorResponseAgainstContract } from "../httpErrorResponseContract.js";

describe("mapErrorToProblemDetails", () => {
  it("maps ValidationError to 400 with the default problem type", () => {
    const result = mapErrorToProblemDetails()(
      new ValidationError("Invalid input"),
    );

    expect(result.status).toBe(400);
    expect(result.title).toBe("Validation Error");
    expect(result.type).toBe("about:blank");
    expect(result.detail).toContain("Invalid input");
  });

  it("maps NotFoundError to 404", () => {
    const result = mapErrorToProblemDetails()(
      new NotFoundError("User", "id-123"),
    );

    expect(result.status).toBe(404);
    expect(result.title).toBe("Not Found");
    expect(result.type).toBe("about:blank");
    expect(result.detail).toContain("Unable to find User");
  });

  it("maps ForbiddenError to 403", () => {
    const result = mapErrorToProblemDetails()(new ForbiddenError());

    expect(result.status).toBe(403);
    expect(result.title).toBe("Forbidden");
    expect(result.type).toBe("about:blank");
  });

  it("maps ConflictError to 409", () => {
    const result = mapErrorToProblemDetails()(
      new ConflictError("Resource already exists"),
    );

    expect(result.status).toBe(409);
    expect(result.title).toBe("Conflict");
    expect(result.type).toBe("about:blank");
  });

  it("maps PreconditionFailedError to 412", () => {
    const result = mapErrorToProblemDetails()(
      new PreconditionFailedError("Version mismatch"),
    );

    expect(result.status).toBe(412);
    expect(result.title).toBe("Precondition Failed");
    expect(result.type).toBe("about:blank");
    expect(result.detail).toContain("Version mismatch");
  });

  it("maps GenericError to 500", () => {
    const result = mapErrorToProblemDetails()(
      new GenericError("Database connection failed"),
    );

    expect(result.status).toBe(500);
    expect(result.title).toBe("Internal Server Error");
    expect(result.type).toBe("about:blank");
  });

  it("uses a custom type base URL when provided", () => {
    const result = mapErrorToProblemDetails({
      typeBaseUrl: "https://ioapp.it/problems/",
    })(new ValidationError("Invalid input"));

    expect(result.type).toBe("https://ioapp.it/problems/validation-error");
  });

  it("adds a trailing slash to a custom type base URL when missing", () => {
    const result = mapErrorToProblemDetails({
      typeBaseUrl: "https://ioapp.it/problems",
    })(new ValidationError("Invalid input"));

    expect(result.type).toBe("https://ioapp.it/problems/validation-error");
  });

  it("uses the custom `tag` of a subclass for the problem type", () => {
    class CustomValidationError extends ValidationError {
      override readonly tag = "custom-validation" as const;
    }

    const result = mapErrorToProblemDetails()(
      new CustomValidationError("Custom input"),
    );

    expect(result.status).toBe(400);
    expect(result.type).toBe("about:blank");
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
    expect(result.type).toBe("about:blank");
  });
});

describe("mapErrorToHttpResponse", () => {
  it("returns a Problem+JSON response with the expected shape", () => {
    const response = mapErrorToHttpResponse()(
      new ValidationError("Invalid data"),
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
      new NotFoundError("User", "user-id"),
    );

    expect(response.status).toBe(404);
    expect(response.jsonBody.status).toBe(404);
  });

  it("maps Conflict to a 409 response", () => {
    const response = mapErrorToHttpResponse()(
      new ConflictError("Duplicate entry"),
    );

    expect(response.status).toBe(409);
    expect(response.jsonBody.status).toBe(409);
  });

  it("maps PreconditionFailed to a 412 response", () => {
    const response = mapErrorToHttpResponse()(
      new PreconditionFailedError("ETag mismatch"),
    );

    expect(response.status).toBe(412);
    expect(response.jsonBody.status).toBe(412);
  });

  it("maps GoneError to a 410 response", () => {
    const response = mapErrorToHttpResponse()(
      new GoneError("resource deleted"),
    );

    expect(response.status).toBe(410);
    expect(response.jsonBody.status).toBe(410);
    expect(response.jsonBody.title).toBe("Gone");
  });

  it("maps TooManyRequestsError to a 429 response", () => {
    const response = mapErrorToHttpResponse()(new TooManyRequestsError());

    expect(response.status).toBe(429);
    expect(response.jsonBody.status).toBe(429);
    expect(response.jsonBody.title).toBe("Too Many Requests");
  });

  it("maps BadGatewayError to a 502 response", () => {
    const response = mapErrorToHttpResponse()(
      new BadGatewayError("upstream failure"),
    );

    expect(response.status).toBe(502);
    expect(response.jsonBody.status).toBe(502);
    expect(response.jsonBody.title).toBe("Bad Gateway");
  });

  it("maps ServiceUnavailableError to a 503 response", () => {
    const response = mapErrorToHttpResponse()(
      new ServiceUnavailableError("under maintenance"),
    );

    expect(response.status).toBe(503);
    expect(response.jsonBody.status).toBe(503);
    expect(response.jsonBody.title).toBe("Service Unavailable");
  });

  it("maps GatewayTimeoutError to a 504 response", () => {
    const response = mapErrorToHttpResponse()(
      new GatewayTimeoutError("upstream timed out"),
    );

    expect(response.status).toBe(504);
    expect(response.jsonBody.status).toBe(504);
    expect(response.jsonBody.title).toBe("Gateway Timeout");
  });
});

describe("validateHttpErrorResponseAgainstContract", () => {
  it("accepts a mapped error with a compatible declared schema", async () => {
    const response = mapErrorToHttpResponse()(new AuthenticationError());

    const result = await validateHttpErrorResponseAgainstContract(response, {
      401: ProblemJson,
    });

    expect(result.isOk()).toBe(true);
  });

  it("rejects an undeclared status", async () => {
    const response = mapErrorToHttpResponse()(new AuthenticationError());

    const result = await validateHttpErrorResponseAgainstContract(response, {
      400: ProblemJson,
    });

    expect(result.isErr()).toBe(true);
  });

  it("rejects a schema that fails at runtime", async () => {
    const response = mapErrorToHttpResponse()(new AuthenticationError());
    const schema = ProblemJson.refine(() => false);

    const result = await validateHttpErrorResponseAgainstContract(response, {
      401: schema,
    });

    expect(result.isErr()).toBe(true);
  });

  it("rejects a schema transform that does not return Problem Details", async () => {
    const response = mapErrorToHttpResponse()(new AuthenticationError());
    const schema = z.unknown().transform(() => ({ invalid: true }));

    const result = await validateHttpErrorResponseAgainstContract(response, {
      401: schema,
    });

    expect(result.isErr()).toBe(true);
  });
});
