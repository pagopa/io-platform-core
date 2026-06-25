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
   * @param message Human-readable description of the failure.
   *
   * The constructor is `protected` so `BaseError` can only be instantiated
   * through one of its concrete subclasses.
   */
  protected constructor(message: string) {
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

  constructor() {
    super("Unauthorized: authentication required");
  }
}

/**
 * An upstream gateway returned an invalid response.
 * Maps to HTTP `502 Bad Gateway`.
 */
export class BadGatewayError extends BaseError {
  override readonly kind = "BadGatewayError" as const;
  override tag = "bad-gateway";

  /** @param message Detail describing the upstream failure. */
  constructor(message: string) {
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

  /** @param message Detail describing what conflicted. */
  constructor(message: string) {
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

  constructor() {
    super("Forbidden: you don't have permission to access this resource");
  }
}

/**
 * An upstream gateway did not respond in time.
 * Maps to HTTP `504 Gateway Timeout`.
 */
export class GatewayTimeoutError extends BaseError {
  override readonly kind = "GatewayTimeoutError" as const;
  override tag = "gateway-timeout";

  /** @param message Detail describing the timeout. */
  constructor(message: string) {
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

  /** @param message Detail describing the failure. */
  constructor(message: string) {
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

  /** @param message Detail describing the gone resource. */
  constructor(message: string) {
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
   * @param message Detail describing the lookup (e.g. the missing id).
   */
  constructor(entityName: string, message: string) {
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

  /** @param message Detail describing the failed precondition. */
  constructor(message: string) {
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

  /** @param message Detail describing why the service is unavailable. */
  constructor(message: string) {
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

  constructor() {
    super("Too many requests");
  }
}

/**
 * The request was well-formed but semantically invalid and cannot be processed.
 * Maps to HTTP `422 Unprocessable Entity`.
 */
export class UnprocessableEntityError extends BaseError {
  override readonly kind = "UnprocessableEntityError" as const;
  override tag = "unprocessable-entity";

  /** @param message Detail describing why the entity is unprocessable. */
  constructor(message: string) {
    super("Unprocessable entity: " + message);
  }
}

/**
 * Input failed validation (bad shape/format). Maps to HTTP `400 Bad Request`.
 */
export class ValidationError extends BaseError {
  override readonly kind = "ValidationError" as const;
  override tag = "validation-error";

  /** @param message Detail describing the validation failure. */
  constructor(message: string) {
    super("Validation error: " + message);
  }
}
