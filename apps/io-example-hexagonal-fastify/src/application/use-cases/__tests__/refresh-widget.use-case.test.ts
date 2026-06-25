import { describe, expect, it } from "vitest";

import { makeRefreshWidgetUseCase } from "../refresh-widget.use-case.js";

describe("makeRefreshWidgetUseCase", () => {
  it("returns the internal job id for the enqueued refresh", async () => {
    const useCase = makeRefreshWidgetUseCase();

    const result = await useCase({ id: "widget-1" });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toStrictEqual({
      jobId: "22222222-2222-4222-8222-222222222222",
    });
  });
});
