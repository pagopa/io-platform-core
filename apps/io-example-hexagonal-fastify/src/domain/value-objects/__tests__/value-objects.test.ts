import { describe, expect, it } from "vitest";

import { CallerIdSchema } from "../caller-id.value-object.js";
import { ClientIpSchema } from "../client-ip.value-object.js";
import { RequestIdSchema } from "../request-id.value-object.js";
import { WidgetIdSchema } from "../widget-id.value-object.js";
import { WidgetTaskIdSchema } from "../widget-task-id.value-object.js";

describe("application value objects", () => {
  it.each([
    ["caller id", CallerIdSchema, "caller-1"],
    ["client IP", ClientIpSchema, "203.0.113.10"],
    ["request id", RequestIdSchema, "request-1"],
  ])("validates a non-empty %s", (_, schema, value) => {
    expect(schema.parse(value)).toBe(value);
    expect(schema.safeParse("").success).toBe(false);
  });

  it.each([
    ["widget id", WidgetIdSchema],
    ["widget task id", WidgetTaskIdSchema],
  ])("validates a UUID %s", (_, schema) => {
    const value = "11111111-1111-4111-8111-111111111111";

    expect(schema.parse(value)).toBe(value);
    expect(schema.safeParse("not-a-uuid").success).toBe(false);
  });
});
