/**
 * Base class for every domain error in the platform.
 *
 * Domain and application code never `throw` for business failures; instead they
 * return a `neverthrow` `Result<T, E>` whose error channel `E` extends
 * {@link BaseError}. Each concrete error carries two discriminators:
 *
 *  - `kind`: a stable, machine-readable identifier (e.g. `"NotFoundError"`) that
 *    adapters branch on to decide how to react to a failure.
 *  - `tag`: a URL-friendly slug (e.g. `"not-found"`) used to build RFC 7807
 *    `type` URIs in the HTTP error mapper.
 */
export class BaseError extends Error {
  /** Machine-readable error discriminator, stable across releases. */
  kind: string;
  /** URL-friendly slug used to build problem `type` URIs. */
  tag: string;

  /**
   * @param message Human-readable description of the failure. Defaults to `"an error occurred"`.
   *
   * The constructor is `protected` so `BaseError` can only be instantiated
   * through one of its concrete subclasses.
   */
  protected constructor(message = "an error occurred") {
    super(message);

    this.kind = "BaseError";
    this.tag = "base-error";
  }
}

/**
 * The request could not be authenticated (no/invalid credentials).
 * Maps to HTTP `401 Unauthorized`.
 */
export class AuthenticationError extends BaseError {
  override readonly kind = "AuthenticationError" as const;
  override tag = "authentication-error";

  /** @param message Optional detail describing the authentication failure. Defaults to `"authentication required"`. */
  constructor(message = "authentication required") {
    super("Unauthorized: " + message);
  }
}

/**
 * An upstream gateway returned an invalid response.
 * Maps to HTTP `502 Bad Gateway`.
 */
export class BadGatewayError extends BaseError {
  override readonly kind = "BadGatewayError" as const;
  override tag = "bad-gateway";

  /** @param message Optional detail describing the upstream failure. Defaults to `"invalid response from upstream"`. */
  constructor(message = "invalid response from upstream") {
    super("Bad gateway: " + message);
  }
}

/**
 * The request conflicts with the current state of the resource
 * (e.g. a duplicate). Maps to HTTP `409 Conflict`.
 */
export class ConflictError extends BaseError {
  override readonly kind = "ConflictError" as const;
  override tag = "conflict";

  /** @param message Optional detail describing what conflicted. Defaults to `"resource conflict"`. */
  constructor(message = "resource conflict") {
    super("Conflict: " + message);
  }
}

/**
 * The caller is authenticated but not allowed to perform the action.
 * Maps to HTTP `403 Forbidden`.
 */
export class ForbiddenError extends BaseError {
  override readonly kind = "ForbiddenError" as const;
  override tag = "forbidden";

  /** @param message Optional detail describing why the action is forbidden. Defaults to `"you don't have permission to access this resource"`. */
  constructor(message = "you don't have permission to access this resource") {
    super("Forbidden: " + message);
  }
}

/**
 * An upstream gateway did not respond in time.
 * Maps to HTTP `504 Gateway Timeout`.
 */
export class GatewayTimeoutError extends BaseError {
  override readonly kind = "GatewayTimeoutError" as const;
  override tag = "gateway-timeout";

  /** @param message Optional detail describing the timeout. Defaults to `"upstream did not respond in time"`. */
  constructor(message = "upstream did not respond in time") {
    super("Gateway timeout: " + message);
  }
}

/**
 * An unexpected, non-classified failure (the catch-all error).
 * Maps to HTTP `500 Internal Server Error`.
 */
export class GenericError extends BaseError {
  override readonly kind = "GenericError" as const;
  override tag = "generic-error";

  /** @param message Optional detail describing the failure. Defaults to `"an unexpected error occurred"`. */
  constructor(message = "an unexpected error occurred") {
    super("Generic error: " + message);
  }
}

/**
 * The requested resource no longer exists and no forwarding address is known.
 * Maps to HTTP `410 Gone`.
 */
export class GoneError extends BaseError {
  override readonly kind = "GoneError" as const;
  override tag = "gone";

  /** @param message Optional detail describing the gone resource. Defaults to `"resource no longer exists"`. */
  constructor(message = "resource no longer exists") {
    super("Gone: " + message);
  }
}

/**
 * A requested entity could not be found. Maps to HTTP `404 Not Found`.
 */
export class NotFoundError extends BaseError {
  /** Name of the entity type that was being looked up (e.g. `"User"`). */
  entityName: string;
  override readonly kind = "NotFoundError" as const;
  override tag = "not-found";

  /**
   * @param entityName Name of the entity type that was not found.
   * @param message Optional detail describing the lookup (e.g. the missing id). Defaults to `"not found"`.
   */
  constructor(entityName: string, message = "not found") {
    super("Unable to find " + entityName + ": " + message);
    this.entityName = entityName;
  }
}

/**
 * A precondition for the request was not met (e.g. an ETag/version mismatch).
 * Maps to HTTP `412 Precondition Failed`.
 */
export class PreconditionFailedError extends BaseError {
  override readonly kind = "PreconditionFailedError" as const;
  override tag = "precondition-failed";

  /** @param message Optional detail describing the failed precondition. Defaults to `"precondition not met"`. */
  constructor(message = "precondition not met") {
    super("Precondition failed: " + message);
  }
}

/**
 * The service is temporarily unavailable (e.g. overloaded or under maintenance).
 * Maps to HTTP `503 Service Unavailable`.
 */
export class ServiceUnavailableError extends BaseError {
  override readonly kind = "ServiceUnavailableError" as const;
  override tag = "service-unavailable";

  /** @param message Optional detail describing why the service is unavailable. Defaults to `"service temporarily unavailable"`. */
  constructor(message = "service temporarily unavailable") {
    super("Service unavailable: " + message);
  }
}

/**
 * The caller has sent too many requests in a given time window (rate-limited).
 * Maps to HTTP `429 Too Many Requests`.
 */
export class TooManyRequestsError extends BaseError {
  override readonly kind = "TooManyRequestsError" as const;
  override tag = "too-many-requests";

  /** @param message Optional detail describing the rate-limit failure. Defaults to `"rate limit exceeded"`. */
  constructor(message = "rate limit exceeded") {
    super("Too many requests: " + message);
  }
}

/**
 * The request was well-formed but semantically invalid and cannot be processed.
 * Maps to HTTP `422 Unprocessable Entity`.
 */
export class UnprocessableEntityError extends BaseError {
  override readonly kind = "UnprocessableEntityError" as const;
  override tag = "unprocessable-entity";

  /** @param message Optional detail describing why the entity is unprocessable. Defaults to `"unable to process request"`. */
  constructor(message = "unable to process request") {
    super("Unprocessable entity: " + message);
  }
}

/**
 * Input failed validation (bad shape/format). Maps to HTTP `400 Bad Request`.
 */
export class ValidationError extends BaseError {
  override readonly kind = "ValidationError" as const;
  override tag = "validation-error";

  /** @param message Optional detail describing the validation failure. Defaults to `"validation failed"`. */
  constructor(message = "validation failed") {
    super("Validation error: " + message);
  }
}
