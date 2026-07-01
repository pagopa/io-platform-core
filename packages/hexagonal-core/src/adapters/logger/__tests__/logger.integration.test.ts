import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";

import type { AppInsightsTelemetryClient } from "../applicationInsightsLogger.js";

import { GenericError } from "../../../domain/errors/index.js";
import { makeApplicationInsightsLogger } from "../applicationInsightsLogger.js";

const recordingClient = () => {
  const exceptions: unknown[] = [];
  const traces: unknown[] = [];
  const client: AppInsightsTelemetryClient = {
    flush: async () => undefined,
    trackEvent: () => undefined,
    trackException: (telemetry) => void exceptions.push(telemetry),
    trackTrace: (telemetry) => void traces.push(telemetry),
  };

  return { client, exceptions, traces };
};

describe("logger integration", () => {
  it("records a trace on success and an exception on failure", async () => {
    const { client, exceptions, traces } = recordingClient();
    const logger = makeApplicationInsightsLogger({
      baseProperties: { service: "svc" },
      client,
    });

    // Stand-in for the application `withLogging` decorator: emit telemetry
    // around a `Result`-returning use case, on both success and failure.
    const run = async (fail: boolean) => {
      const result = fail ? err(new GenericError("nope")) : ok({ id: "1" });
      logger.info("uc done", { ok: result.isOk() });
      if (result.isErr()) {
        logger.trackException({ error: new Error(result.error.message) });
      }
      return result;
    };

    await run(false);
    await run(true);
    await logger.flush();

    expect(traces).toHaveLength(2);
    expect(exceptions).toHaveLength(1);
  });
});
