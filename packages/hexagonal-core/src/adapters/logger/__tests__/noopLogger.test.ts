import { describe, expect, it } from "vitest";

import { noopLogger } from "../noopLogger.js";

describe("noopLogger", () => {
  it("exposes every Logger method returning undefined", () => {
    expect(noopLogger.debug("m")).toBeUndefined();
    expect(noopLogger.info("m")).toBeUndefined();
    expect(noopLogger.warn("m")).toBeUndefined();
    expect(noopLogger.error("m")).toBeUndefined();
    expect(noopLogger.trackEvent({ name: "e" })).toBeUndefined();
    expect(
      noopLogger.trackException({ error: new Error("x") }),
    ).toBeUndefined();
  });

  it("flush() resolves", async () => {
    await expect(noopLogger.flush()).resolves.toBeUndefined();
  });

  it("with() returns the same instance", () => {
    expect(noopLogger.with({ correlationId: "c-1" })).toBe(noopLogger);
  });
});
