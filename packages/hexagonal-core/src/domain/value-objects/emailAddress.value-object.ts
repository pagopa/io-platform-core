import { z } from "zod";

/**
 * Zod schema for a validated, normalized e-mail address.
 *
 * Validation pipeline:
 *  1. must be a string matching a basic `local@domain.tld` shape;
 *  2. is lower-cased via `transform` so that equal addresses compare equal;
 *  3. is branded as `EmailAddress` so a plain `string` cannot be used where an
 *     `EmailAddress` is expected.
 */
export const EmailAddressSchema = z
  .string()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address")
  .transform((v) => v.toLowerCase())
  .brand<"EmailAddress">();

/** A syntactically valid, lower-cased e-mail address (branded `string`). */
export type EmailAddress = z.infer<typeof EmailAddressSchema>;
