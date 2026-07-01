import type {
  DomainEvent,
  Logger,
  LogLevel,
  LogProperties,
  TrackedException,
} from "../../domain/ports/outbound/index.js";

import { type AppInsightsSeverity, toAppInsightsSeverity } from "./severity.js";

/**
 * Minimal structural surface consumed from the corporate tracing library
 * (Tech Radar `pagopa-azure-tracing`, npm `@pagopa/azure-tracing`). Depending
 * on this seam — rather than the full vendor client — keeps the adapter
 * testable and decoupled.
 */
export interface AppInsightsTelemetryClient {
  /** Flush buffered telemetry (optional on the vendor client). */
  flush?(): Promise<void> | void;
  trackEvent(telemetry: {
    name: string;
    properties?: Record<string, unknown>;
  }): void;
  trackException(telemetry: {
    exception: Error;
    properties?: Record<string, unknown>;
  }): void;
  trackTrace(telemetry: {
    message: string;
    properties?: Record<string, unknown>;
    severity: AppInsightsSeverity;
  }): void;
}

/** Dependencies for {@link makeApplicationInsightsLogger} (Dependency Injection). */
export interface ApplicationInsightsLoggerDeps {
  /**
   * Properties merged into every emitted item (service name, env, region, …).
   * Call-site / child-context properties take precedence over these.
   */
  readonly baseProperties?: LogProperties;
  /** Pre-initialized telemetry client from the corporate tracing library. */
  readonly client: AppInsightsTelemetryClient;
}

/**
 * Builds a {@link Logger} backed by Azure Application Insights through the
 * corporate `@pagopa/azure-tracing` library.
 *
 * SDK *initialization* (connection string, sampling, live metrics) is a
 * composition-root concern and is intentionally NOT performed here: an already
 * configured `client` is injected, so this adapter is a pure mapping layer.
 *
 * @param deps Injected client + base properties.
 * @returns A non-throwing {@link Logger}.
 */
export const makeApplicationInsightsLogger = (
  deps: ApplicationInsightsLoggerDeps,
): Logger => {
  const { baseProperties, client } = deps;

  /** Merge base + call-site properties (call-site wins). */
  const merge = (properties?: LogProperties): Record<string, unknown> => ({
    ...baseProperties,
    ...properties,
  });

  const trace = (
    level: LogLevel,
    message: string,
    properties?: LogProperties,
  ): void =>
    client.trackTrace({
      message,
      properties: merge(properties),
      severity: toAppInsightsSeverity(level),
    });

  const logger: Logger = {
    debug: (message, properties) => trace("debug", message, properties),
    error: (message, properties) => trace("error", message, properties),
    flush: async () => {
      await client.flush?.();
    },
    info: (message, properties) => trace("info", message, properties),
    trackEvent: (event: DomainEvent) =>
      client.trackEvent({
        name: event.name,
        properties: merge(event.properties),
      }),
    trackException: (exception: TrackedException) =>
      client.trackException({
        exception: exception.error,
        properties: merge(exception.properties),
      }),
    warn: (message, properties) => trace("warn", message, properties),
    with: (context: LogProperties) =>
      // Child logger: fold the new context into baseProperties.
      makeApplicationInsightsLogger({
        baseProperties: { ...baseProperties, ...context },
        client,
      }),
  };

  return logger;
};
