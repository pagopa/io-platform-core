import type { LogLevel } from "../../domain/ports/outbound/index.js";

/**
 * Application Insights `SeverityLevel` numeric values. Mirrored here so the
 * adapter needn't import the vendor enum.
 * @see https://learn.microsoft.com/azure/azure-monitor/app/data-model-complete#severitylevel
 */
export const AppInsightsSeverity = {
  Critical: 4,
  Error: 3,
  Information: 1,
  Verbose: 0,
  Warning: 2,
} as const;

export type AppInsightsSeverity =
  (typeof AppInsightsSeverity)[keyof typeof AppInsightsSeverity];

/** Maps a transport-neutral {@link LogLevel} to an App Insights severity. */
export const toAppInsightsSeverity = (level: LogLevel): AppInsightsSeverity => {
  switch (level) {
    case "debug":
      return AppInsightsSeverity.Verbose;
    case "error":
      return AppInsightsSeverity.Error;
    case "info":
      return AppInsightsSeverity.Information;
    case "warn":
      return AppInsightsSeverity.Warning;
  }
};
