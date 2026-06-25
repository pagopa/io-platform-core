import { z } from "zod";

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
export const FiscalCodeSchema = z
  .string()
  .regex(cfRegex, "Invalid Fiscal Code")
  .brand<"FiscalCode">();

/** A syntactically valid Italian fiscal code (branded `string`). */
export type FiscalCode = z.infer<typeof FiscalCodeSchema>;
