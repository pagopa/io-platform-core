import { z } from "zod";

/** Unique symbol used to distinguish fiscal codes from other strings. */
export const FiscalCodeBrand = Symbol("FiscalCode");

// Italian "codice fiscale" canonical pattern: 6 letters, 2 alnum, a month
// control letter, 2 alnum (day/sex), province letter, 3 alnum, final check char.
const cfRegex =
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i;

/**
 * Zod schema for an Italian fiscal code (codice fiscale).
 *
 * Accepts the canonical 16-character format (case-insensitive) and brands the
 * result as `FiscalCode` so it cannot be confused with an arbitrary `string`.
 */
export type FiscalCodeSchemaType = z.core.$ZodBranded<
  z.ZodString,
  typeof FiscalCodeBrand,
  "out"
>;

export const FiscalCodeSchema: FiscalCodeSchemaType = z
  .string()
  .regex(cfRegex, "Invalid Fiscal Code")
  .brand(FiscalCodeBrand);

/** A syntactically valid Italian fiscal code (branded `string`). */
export type FiscalCode = z.infer<typeof FiscalCodeSchema>;
