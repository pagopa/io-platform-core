import { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import { describe, expect, it } from "vitest";

import { makeCreateWidgetUseCase } from "../create-widget.use-case.js";

describe("makeCreateWidgetUseCase", () => {
  it("returns a not implemented error", async () => {
    const useCase = makeCreateWidgetUseCase();

    const result = await useCase({ description: "Demo widget", name: "Demo" });

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(GenericError);
    expect(error.message).toContain("Not Implemented");
  });
});
