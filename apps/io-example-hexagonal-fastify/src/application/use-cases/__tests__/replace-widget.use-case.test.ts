import { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import { describe, expect, it } from "vitest";

import { makeReplaceWidgetUseCase } from "../replace-widget.use-case.js";

describe("makeReplaceWidgetUseCase", () => {
  it("returns a not implemented error", async () => {
    const useCase = makeReplaceWidgetUseCase();

    const result = await useCase({
      description: "Replaced widget",
      id: "00000000-0000-4000-8000-000000000000",
      name: "Replaced",
    });

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(GenericError);
    expect(error.message).toContain("Not Implemented");
  });
});
