import { describe, expect, it } from "vitest";

import { EmailAddressSchema } from "../emailAddress.value-object.js";

describe("EmailAddressSchema", () => {
  it("accepts a valid address and normalizes it to lower-case", () => {
    expect(EmailAddressSchema.parse("User.Name@Example.COM")).toBe(
      "user.name@example.com"
    );
  });

  it("rejects a malformed address", () => {
    expect(EmailAddressSchema.safeParse("not-an-email").success).toBe(false);
    expect(EmailAddressSchema.safeParse("missing@dot").success).toBe(false);
    expect(EmailAddressSchema.safeParse("").success).toBe(false);
  });
});
