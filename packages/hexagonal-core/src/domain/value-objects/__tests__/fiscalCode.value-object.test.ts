import { describe, expect, it } from "vitest";

import { FiscalCodeSchema } from "../fiscalCode.value-object.js";

describe("FiscalCodeSchema", () => {
  it("accepts a well-formed fiscal code (case-insensitive)", () => {
    expect(FiscalCodeSchema.safeParse("RSSMRA85T10A562S").success).toBe(true);
    expect(FiscalCodeSchema.safeParse("rssmra85t10a562s").success).toBe(true);
  });

  it("rejects a malformed fiscal code", () => {
    expect(FiscalCodeSchema.safeParse("INVALID").success).toBe(false);
    expect(FiscalCodeSchema.safeParse("RSSMRA85T10A562").success).toBe(false);
    expect(FiscalCodeSchema.safeParse("").success).toBe(false);
  });
});
