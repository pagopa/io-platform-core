import type { Logger } from "../../domain/ports/outbound/index.js";

/**
 * A {@link Logger} that discards everything. Useful in unit tests and local
 * runs where no telemetry backend is wired (mirrors `emptyValidator`).
 */
export const noopLogger: Logger = {
  debug: () => undefined,
  error: () => undefined,
  flush: async () => undefined,
  info: () => undefined,
  trackEvent: () => undefined,
  trackException: () => undefined,
  warn: () => undefined,
  with: () => noopLogger,
};
