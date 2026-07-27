import { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import { describe, expect, it } from "vitest";

import { RequestIdSchema } from "../../../domain/value-objects/request-id.value-object.js";
import { makeGetWidgetAuditUseCase } from "../get-widget-audit.use-case.js";

describe("makeGetWidgetAuditUseCase", () => {
  it("returns a not implemented error", async () => {
    const useCase = makeGetWidgetAuditUseCase();

    const result = await useCase({
      id: "00000000-0000-4000-8000-000000000000",
      requestId: RequestIdSchema.parse("request-1"),
    });

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(GenericError);
    expect(error.message).toContain("Not Implemented");
  });
});
