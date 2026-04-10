import { describe, expect, it } from "vitest";

import { EmailAddress } from "../emailAddress.value-object.js";

describe("EmailAddress.create", () => {
  it("should accept a valid email address", () => {
    const result = EmailAddress.create("user@example.com");
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe("user@example.com");
  });

  it("should lowercase the email", () => {
    const result = EmailAddress.create("User@EXAMPLE.COM");
    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe("user@example.com");
  });

  it("should reject an email without @", () => {
    const result = EmailAddress.create("invalid-email");
    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr().message).toContain("Invalid email");
  });

  it("should reject an email without domain", () => {
    const result = EmailAddress.create("user@");
    expect(result.isErr()).toBe(true);
  });

  it("should reject an empty string", () => {
    const result = EmailAddress.create("");
    expect(result.isErr()).toBe(true);
  });

  it("should reject an email with spaces", () => {
    const result = EmailAddress.create("user @example.com");
    expect(result.isErr()).toBe(true);
  });
});
