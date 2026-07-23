import { describe, expect, it } from "vitest";

import { WidgetAlreadyExistsError } from "../../../domain/errors/widget-already-exists.error.js";
import { makeCreateWidgetUseCase } from "../create-widget.use-case.js";

describe("makeCreateWidgetUseCase", () => {
  it("returns a widget-already-exists conflict error", async () => {
    const useCase = makeCreateWidgetUseCase();

    const result = await useCase({ description: "Demo widget", name: "Demo" });

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(WidgetAlreadyExistsError);
    expect(error.kind).toBe("ConflictError");
    expect(error.tag).toBe("widget-already-exists");
    expect(error.message).toContain("already exists");
  });
});
