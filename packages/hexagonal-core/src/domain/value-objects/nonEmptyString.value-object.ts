import { z } from "zod";

/** Unique symbol used to distinguish non-empty strings from plain strings. */
export const NonEmptyStringBrand = Symbol("NonEmptyString");

/**
 * Zod schema for a string guaranteed to contain at least one character.
 *
 * Branding the result as `NonEmptyString` prevents a possibly-empty `string`
 * from being passed where a non-empty value is required.
 */

export type NonEmptyStringSchemaType = z.core.$ZodBranded<
  z.ZodString,
  typeof NonEmptyStringBrand,
  "out"
>;

export const NonEmptyStringSchema: NonEmptyStringSchemaType = z
  .string()
  .min(1, "String cannot be empty")
  .brand(NonEmptyStringBrand);
/** A string proven to be non-empty (branded `string`). */
export type NonEmptyString = z.infer<typeof NonEmptyStringSchema>;
