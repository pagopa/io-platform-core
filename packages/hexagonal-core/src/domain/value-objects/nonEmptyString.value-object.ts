import { z } from "zod";

/**
 * Zod schema for a string guaranteed to contain at least one character.
 *
 * Branding the result as `NonEmptyString` prevents a possibly-empty `string`
 * from being passed where a non-empty value is required.
 */
export const NonEmptyStringSchema = z
  .string()
  .min(1, "String cannot be empty")
  .brand<"NonEmptyString">();

/** A string proven to be non-empty (branded `string`). */
export type NonEmptyString = z.infer<typeof NonEmptyStringSchema>;
