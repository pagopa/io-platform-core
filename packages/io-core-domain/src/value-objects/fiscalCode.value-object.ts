import { z } from "zod";

const cfRegex =
  /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i;

export const FiscalCodeBrand = Symbol("FiscalCode");

export const FiscalCodeSchema = z
  .string()
  .regex(cfRegex, "Invalid Fiscal Code")
  .brand<typeof FiscalCodeBrand>();

export type FiscalCode = z.infer<typeof FiscalCodeSchema>;
