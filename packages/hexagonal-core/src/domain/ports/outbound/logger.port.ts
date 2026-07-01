/**
 * Technology-agnostic logging & telemetry outbound port.
 *
 * Lives in the domain so the application layer can depend on *logging as a
 * capability* without knowing anything about Application Insights,
 * OpenTelemetry or `console`. Concrete adapters (see `adapters/logger`)
 * implement it. All methods are side-effect-only and MUST never throw:
 * logging must not alter a use case's control flow.
 */

/** A custom business/domain event (maps to App Insights `customEvents`). */
export interface DomainEvent {
  /** Stable event name, e.g. `"UserProfileCreated"`. */
  readonly name: string;
  /** Optional custom dimensions. */
  readonly properties?: LogProperties;
}

/**
 * Outbound port for structured logging and telemetry.
 *
 * @remarks Implementations MUST be non-throwing and side-effect-only.
 */
export interface Logger {
  /** Low-level diagnostic trace (App Insights severity `Verbose`). */
  debug(message: string, properties?: LogProperties): void;
  /** Error trace (severity `Error`). */
  error(message: string, properties?: LogProperties): void;

  /**
   * Flush buffered telemetry. Relevant on serverless hosts (Azure Functions)
   * where the worker may be suspended before the SDK batch timer fires.
   * A no-op for unbuffered adapters.
   */
  flush(): Promise<void>;

  /** Informational trace (severity `Information`). */
  info(message: string, properties?: LogProperties): void;

  /** Track a custom domain event (App Insights `customEvents`). */
  trackEvent(event: DomainEvent): void;
  /** Track a handled/unhandled exception with its stack. */
  trackException(exception: TrackedException): void;

  /** Warning trace (severity `Warning`). */
  warn(message: string, properties?: LogProperties): void;

  /**
   * Derive a child logger whose `context` is merged into every subsequent
   * item's properties (e.g. a correlation id bound per request).
   */
  with(context: LogProperties): Logger;
}

/** Ordered severity levels, least → most severe. Transport-neutral. */
export type LogLevel = "debug" | "error" | "info" | "warn";

/**
 * Serializable metadata attached to a trace or telemetry item. Values are
 * primitives so any backend (App Insights custom dimensions, JSON console, …)
 * can render them without loss.
 */
export type LogProperties = Readonly<Record<string, boolean | number | string>>;

/** A tracked exception (maps to App Insights `exceptions`). */
export interface TrackedException {
  /** The error to report (its stack is preserved by the backend). */
  readonly error: Error;
  /** Optional custom dimensions. */
  readonly properties?: LogProperties;
}
