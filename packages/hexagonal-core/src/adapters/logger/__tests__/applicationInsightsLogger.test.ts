import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AppInsightsTelemetryClient } from "../applicationInsightsLogger.js";

import { makeApplicationInsightsLogger } from "../applicationInsightsLogger.js";
import { AppInsightsSeverity } from "../severity.js";

const makeClientMock = (): AppInsightsTelemetryClient => ({
  flush: vi.fn(async () => undefined),
  trackEvent: vi.fn(),
  trackException: vi.fn(),
  trackTrace: vi.fn(),
});

describe("makeApplicationInsightsLogger", () => {
  let client: AppInsightsTelemetryClient;

  beforeEach(() => {
    client = makeClientMock();
  });

  it("maps info() to trackTrace with Information severity + merged props", () => {
    const logger = makeApplicationInsightsLogger({
      baseProperties: { service: "svc" },
      client,
    });

    logger.info("hello", { userId: "u1" });

    expect(client.trackTrace).toHaveBeenCalledWith({
      message: "hello",
      properties: { service: "svc", userId: "u1" },
      severity: AppInsightsSeverity.Information,
    });
  });

  it.each([
    ["debug", AppInsightsSeverity.Verbose],
    ["warn", AppInsightsSeverity.Warning],
    ["error", AppInsightsSeverity.Error],
  ] as const)("maps %s() to severity %s", (method, severity) => {
    const logger = makeApplicationInsightsLogger({ client });

    logger[method]("m");

    expect(client.trackTrace).toHaveBeenCalledWith(
      expect.objectContaining({ severity }),
    );
  });

  it("forwards trackEvent and trackException", () => {
    const logger = makeApplicationInsightsLogger({ client });
    const error = new Error("boom");

    logger.trackEvent({ name: "UserCreated", properties: { plan: "free" } });
    logger.trackException({ error, properties: { kind: "GenericError" } });

    expect(client.trackEvent).toHaveBeenCalledWith({
      name: "UserCreated",
      properties: { plan: "free" },
    });
    expect(client.trackException).toHaveBeenCalledWith({
      exception: error,
      properties: { kind: "GenericError" },
    });
  });

  it("with() returns a child logger that merges context (call-site wins)", () => {
    const logger = makeApplicationInsightsLogger({
      baseProperties: { service: "svc" },
      client,
    }).with({ correlationId: "c-1" });

    logger.info("x", { service: "override" });

    expect(client.trackTrace).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: { correlationId: "c-1", service: "override" },
      }),
    );
  });

  it("flush() awaits client.flush and tolerates its absence", async () => {
    const logger = makeApplicationInsightsLogger({ client });

    await expect(logger.flush()).resolves.toBeUndefined();
    expect(client.flush).toHaveBeenCalledTimes(1);

    const noFlush = makeApplicationInsightsLogger({
      client: { ...makeClientMock(), flush: undefined },
    });

    await expect(noFlush.flush()).resolves.toBeUndefined();
  });
});
