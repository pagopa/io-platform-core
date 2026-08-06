import { z } from "zod";

/** Unique symbol used to distinguish e-mail addresses from other strings. */
export const EmailAddressBrand = Symbol("EmailAddress");

/**
 * Zod schema for a validated, normalized e-mail address.
 *
 * Validation pipeline:
 *  1. must be a string matching a basic `local@domain.tld` shape;
 *  2. is lower-cased via `transform` so that equal addresses compare equal;
 *  3. is branded as `EmailAddress` so a plain `string` cannot be used where an
 *     `EmailAddress` is expected.
 */
export type EmailAddressSchemaType = z.core.$ZodBranded<
  z.ZodPipe<z.ZodString, z.ZodTransform<string, string>>,
  typeof EmailAddressBrand,
  "out"
>;

export const EmailAddressSchema: EmailAddressSchemaType = z
  .string()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address")
  .transform((v) => v.toLowerCase())
  .brand(EmailAddressBrand);

/** A syntactically valid, lower-cased e-mail address (branded `string`). */
export type EmailAddress = z.infer<typeof EmailAddressSchema>;
