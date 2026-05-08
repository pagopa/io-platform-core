import { BaseError } from "@pagopa/io-core-domain/errors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { Context } from "hono";

interface ProblemDetails {
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
  ConflictError: { status: 409, title: "Conflict" },
  ForbiddenError: { status: 403, title: "Forbidden" },
  GenericError: { status: 500, title: "Internal Server Error" },
  NotFoundError: { status: 404, title: "Not Found" },
  PreconditionFailedError: { status: 412, title: "Precondition Failed" },
  UnprocessableEntityError: { status: 422, title: "Unprocessable Entity" },
  ValidationError: { status: 400, title: "Validation Error" },
};

const PROBLEM_TYPE_BASE_URL = "https://ioapp.it/problems/";

const defaultHttpConfig: HttpErrorConfig = {
  status: 500,
  title: "Internal Server Error",
};

const mapErrorToProblemDetails = (error: BaseError): ProblemDetails => {
  const config = errorKindToHttpConfig[error.kind] ?? defaultHttpConfig;
  return {
    detail: error.message,
    status: config.status,
    title: config.title,
    type: PROBLEM_TYPE_BASE_URL + error.tag,
  };
};

export const sendErrorResponse = (c: Context, error: BaseError): Response => {
  const problemDetails = mapErrorToProblemDetails(error);
  return c.json(problemDetails, problemDetails.status as ContentfulStatusCode, {
    "Content-Type": "application/problem+json; charset=utf-8",
  });
};
