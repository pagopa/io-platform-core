import type {
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
} from "../../domain/errors/index.js";

/**
 * Discriminator literal (`kind`) of every concrete {@link BaseError} subclass
 * known to the HTTP layer.
 */
export type ErrorKind = keyof KindToError;

/**
 * Maps an error `kind` to its concrete error-class instance type. This is the
 * single source of truth for the set of domain errors the HTTP layer knows how
 * to map to a status. Adding a new mappable error requires extending this map
 * (or TypeScript fails the `satisfies` check on {@link errorMetadata}).
 */
export interface KindToError {
  AuthenticationError: AuthenticationError;
  BadGatewayError: BadGatewayError;
  ConflictError: ConflictError;
  ForbiddenError: ForbiddenError;
  GatewayTimeoutError: GatewayTimeoutError;
  GenericError: GenericError;
  GoneError: GoneError;
  NotFoundError: NotFoundError;
  PreconditionFailedError: PreconditionFailedError;
  ServiceUnavailableError: ServiceUnavailableError;
  TooManyRequestsError: TooManyRequestsError;
  UnprocessableEntityError: UnprocessableEntityError;
  ValidationError: ValidationError;
}

/** Re-exported for places that need the abstract base class type. */
export type { BaseError };

/**
 * Maps a domain error `kind` to the HTTP status code the adapter must emit and
 * the human-readable title used in RFC 7807 Problem Details.
 *
 * This is the **single source of truth** shared by the runtime error mapper and
 * the compile-time route-contract coverage checks. The `satisfies` clause
 * guarantees exhaustiveness over {@link ErrorKind}: if a new mappable error is
 * introduced, the compiler requires this map to be updated.
 */
export const errorMetadata = {
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
} as const satisfies Record<ErrorKind, { status: number; title: string }>;

/**
 * Maps an error kind literal to its HTTP status code literal type.
 * Used for compile-time response-map coverage checks.
 */
export type ErrorKindToStatus<K> = K extends ErrorKind
  ? ErrorMetadata[K]["status"]
  : never;

/** Type of the {@link errorMetadata} table. */
export type ErrorMetadata = typeof errorMetadata;

/** Union of error-class instances corresponding to a tuple of declared kinds. */
export type ErrorsFromKinds<K extends readonly ErrorKind[]> =
  KindToError[K[number]];

/**
 * Reverse lookup: given a tuple of {@link ErrorKind}s, the union of their HTTP
 * statuses. Used by the OpenAPI generator to produce one response per status.
 */
export type StatusesFor<K extends readonly ErrorKind[]> = StatusForKind<
  K[number]
>;

/** HTTP status code emitted for a given domain error kind. */
export type StatusForKind<K extends ErrorKind> = K extends keyof ErrorMetadata
  ? ErrorMetadata[K]["status"]
  : never;
