import { describe, expect, it } from "vitest";

import { NonEmptyStringSchema } from "../nonEmptyString.value-object.js";

describe("NonEmptyStringSchema", () => {
  it("accepts a string with at least one character", () => {
    expect(NonEmptyStringSchema.parse("hello")).toBe("hello");
  });

  it("rejects an empty string", () => {
    expect(NonEmptyStringSchema.safeParse("").success).toBe(false);
  });
});
