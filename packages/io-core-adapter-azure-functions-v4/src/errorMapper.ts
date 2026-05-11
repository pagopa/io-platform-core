import type { HttpResponseInit } from "@azure/functions";

import { BaseError } from "@pagopa/io-core-domain/errors";

/**
 * RFC 7807 Problem Details JSON structure
 * @see https://tools.ietf.org/html/rfc7807
 */
export interface ProblemDetails {
  readonly detail: string;
  readonly status: number;
  readonly title: string;
  readonly type: string;
}

interface HttpErrorConfig {
  readonly status: number;
  readonly title: string;
}

const errorKindToHttpConfig: Record<string, HttpErrorConfig> = {
  AuthenticationError: { status: 401, title: "Unauthorized" },
  ConflictError: { status: 409, title: "Conflict" },
  ForbiddenError: { status: 403, title: "Forbidden" },
  GenericError: { status: 500, title: "Internal Server Error" },
  NotFoundError: { status: 404, title: "Not Found" },
  PreconditionFailedError: { status: 412, title: "Precondition Failed" },
  UnprocessableEntityError: { status: 422, title: "Unprocessable Entity" },
  ValidationError: { status: 400, title: "Validation Error" },
};

/**
 * Maps domain errors to HTTP response with status code and Problem+JSON body
 */
export const mapErrorToHttpResponse = (error: BaseError): HttpResponseInit => {
  const problemDetails = mapErrorToProblemDetails(error);

  return {
    headers: {
      "content-type": "application/problem+json",
    },
    jsonBody: problemDetails,
    status: problemDetails.status,
  };
};

const PROBLEM_TYPE_BASE_URL = "https://ioapp.it/problems/";

/**
 * Maps domain errors to RFC 7807 Problem Details structure
 */
export const mapErrorToProblemDetails = (error: BaseError): ProblemDetails => {
  const config = errorKindToHttpConfig[error.kind] ?? defaultHttpConfig;

  return {
    detail: error.message,
    status: config.status,
    title: config.title,
    type: PROBLEM_TYPE_BASE_URL + error.tag,
  };
};

const defaultHttpConfig: HttpErrorConfig = {
  status: 500,
  title: "Internal Server Error",
};
