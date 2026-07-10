import { describe, expect, it } from "vitest";

import { makeGetWidgetSummaryUseCase } from "../get-widget-summary.use-case.js";

describe("makeGetWidgetSummaryUseCase", () => {
  it("returns an internal summary view shaped differently from the public DTO", async () => {
    const useCase = makeGetWidgetSummaryUseCase();

    const result = await useCase({ id: "widget-1" });

    expect(result.isOk()).toBe(true);
    const view = result._unsafeUnwrap();
    expect(view).toStrictEqual({
      createdAtEpochMs: Date.UTC(2024, 0, 1),
      details: "Sample widget summary",
      label: "Sample Widget",
      widgetId: "widget-1",
    });
  });
});
