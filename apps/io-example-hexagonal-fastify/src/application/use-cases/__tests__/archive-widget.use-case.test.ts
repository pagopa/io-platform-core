import { describe, expect, it } from "vitest";

import { makeArchiveWidgetUseCase } from "../archive-widget.use-case.js";

describe("makeArchiveWidgetUseCase", () => {
  it("returns an archived result even though the contract strips the body", async () => {
    const useCase = makeArchiveWidgetUseCase();

    const result = await useCase({ id: "widget-1" });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toStrictEqual({ archived: true });
  });
});
