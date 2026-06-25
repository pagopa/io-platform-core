import type { BaseError } from "../../domain/errors/index.js";

/**
 * Framework-agnostic HTTP error response. Adapters (fastify, azure-functions, …)
 * can forward this directly or translate it into their own response object,
 * avoiding the need to re-implement error mapping per framework.
 */
export interface HttpErrorResponse {
  /** Response headers (always `application/problem+json`). */
  readonly headers: Readonly<Record<string, string>>;
  /** RFC 7807 body. */
  readonly jsonBody: ProblemDetails;
  /** HTTP status code. */
  readonly status: number;
}

/**
 * RFC 7807 "Problem Details" object — the canonical JSON body used to describe
 * an HTTP API error.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc7807
 */
export interface ProblemDetails {
  /** Human-readable explanation specific to this occurrence of the problem. */
  readonly detail: string;
  /** HTTP status code. */
  readonly status: number;
  /** Short, human-readable summary of the problem type. */
  readonly title: string;
  /** URI reference identifying the problem type. */
  readonly type: string;
}

interface HttpErrorConfig {
  readonly status: number;
  readonly title: string;
}

/**
 * Maps every known domain error `kind` to the HTTP status + title to expose.
 * Unknown kinds fall back to {@link defaultHttpConfig}.
 */
const errorKindToHttpConfig: Record<string, HttpErrorConfig> = {
  AuthenticationError: { status: 401, title: "Unauthorized" },
  BadGatewayError: { status: 502, title: "Bad Gateway" },
  ConflictError: { status: 409, title: "Conflict" },
  ForbiddenError: { status: 403, title: "Forbidden" },
  GatewayTimeoutError: { status: 504, title: "Gateway Timeout" },
  GenericError: { status: 500, title: "Internal Server Error" },
  GoneError: { status: 410, title: "Gone" },
  NotFoundError: { status: 404, title: "Not Found" },
  PreconditionFailedError: { status: 412, title: "Precondition Failed" },
  ServiceUnavailableError: { status: 503, title: "Service Unavailable" },
  TooManyRequestsError: { status: 429, title: "Too Many Requests" },
  UnprocessableEntityError: { status: 422, title: "Unprocessable Entity" },
  ValidationError: { status: 400, title: "Validation Error" },
};

/** Base URI under which problem `type` slugs are published. */
const DEFAULT_TYPE_BASE_URL = "https://example.pagopa.it/problems/";

/** Fallback config used when an error `kind` is not recognised. */
const defaultHttpError: HttpErrorConfig = {
  status: 500,
  title: "Internal Server Error",
};

/**
 * Optional configuration for mapping errors.
 */
export interface ErrorMapperConfig {
  /**
   * Base URI under which problem `type` slugs are published.
   * Overrides the default `https://example.pagopa.it/problems/`.
   */
  readonly typeBaseUrl?: string;
}

/**
 * Maps a domain {@link BaseError} to an RFC 7807 {@link ProblemDetails} object.
 *
 * The `status`/`title` are derived from the error `kind`; the `type` URI is
 * derived from the error `tag` (so subclasses can customise their problem type
 * simply by overriding `tag`). Unknown kinds default to `500`.
 *
 * @param config Optional configuration for the error mapper.
 * @returns A function mapping a domain error to the corresponding problem details.
 */
export const mapErrorToProblemDetails =
  (config?: ErrorMapperConfig) =>
  (error: BaseError): ProblemDetails => {
    const errorConfig = errorKindToHttpConfig[error.kind] ?? defaultHttpError;

    return {
      detail: error.message,
      status: errorConfig.status,
      title: errorConfig.title,
      type: (config?.typeBaseUrl || DEFAULT_TYPE_BASE_URL) + error.tag,
    };
  };

/**
 * Maps a domain {@link BaseError} to a framework-agnostic HTTP error response
 * (`status` + `headers` + `jsonBody`) carrying an RFC 7807 body.
 *
 * @param config Optional configuration for the error mapper.
 * @returns A function mapping a domain error to a transport-neutral HTTP error response.
 */
export const mapErrorToHttpResponse =
  (config?: ErrorMapperConfig) =>
  (error: BaseError): HttpErrorResponse => {
    const problemDetails = mapErrorToProblemDetails(config)(error);

    return {
      headers: { "content-type": "application/problem+json" },
      jsonBody: problemDetails,
      status: problemDetails.status,
    };
  };
