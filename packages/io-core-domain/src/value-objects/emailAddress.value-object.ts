import { z } from "zod";

export const EmailAddressBrand = Symbol("EmailAddress");

export const EmailAddressSchema = z
  .string()
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email address")
  .transform((v) => v.toLowerCase())
  .brand<typeof EmailAddressBrand>();

export type EmailAddress = z.infer<typeof EmailAddressSchema>;
