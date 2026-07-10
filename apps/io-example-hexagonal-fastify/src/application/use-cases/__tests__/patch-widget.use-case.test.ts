import { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import { describe, expect, it } from "vitest";

import { makePatchWidgetUseCase } from "../patch-widget.use-case.js";

describe("makePatchWidgetUseCase", () => {
  it("returns a not implemented error", async () => {
    const useCase = makePatchWidgetUseCase();

    const result = await useCase({
      id: "00000000-0000-4000-8000-000000000000",
      name: "Patched",
    });

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(GenericError);
    expect(error.message).toContain("Not Implemented");
  });
});
