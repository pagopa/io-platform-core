import { describe, expect, it } from "vitest";

import { WidgetAccessSchema } from "../../../domain/entities/widget-access.entity.js";
import { makeGetWidgetAccessUseCase } from "../get-widget-access.use-case.js";

describe("makeGetWidgetAccessUseCase", () => {
  it("returns the application input assembled by the inbound adapter", async () => {
    const useCase = makeGetWidgetAccessUseCase();
    const input = WidgetAccessSchema.parse({
      caller: { email: "user@example.com", id: "user-1" },
      clientIp: "203.0.113.10",
      widgetId: "11111111-1111-4111-8111-111111111111",
    });

    const result = await useCase(input);

    expect(result._unsafeUnwrap()).toEqual({
      caller: { email: "user@example.com", id: "user-1" },
      clientIp: "203.0.113.10",
      widgetId: "11111111-1111-4111-8111-111111111111",
    });
  });
});
