import { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import { describe, expect, it } from "vitest";

import { makeGetWidgetUseCase } from "../get-widget.use-case.js";

describe("makeGetWidgetUseCase", () => {
  it("returns a not implemented error", async () => {
    const useCase = makeGetWidgetUseCase();

    const result = await useCase({
      id: "00000000-0000-4000-8000-000000000000",
    });

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(GenericError);
    expect(error.message).toContain("Not Implemented");
  });
});
