import { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import { describe, expect, it } from "vitest";

import { makeListWidgetsUseCase } from "../list-widgets.use-case.js";

describe("makeListWidgetsUseCase", () => {
  it("returns a not implemented error", async () => {
    const useCase = makeListWidgetsUseCase();

    const result = await useCase({ filter: "demo", page: 1, pageSize: 10 });

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(GenericError);
    expect(error.message).toContain("Not Implemented");
  });
});
