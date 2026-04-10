import { EmailAddress, ValidationError } from "@pagopa/io-core-domain";
import z from "zod";

export const EmailAddressSchema: z.Schema<EmailAddress, z.ZodTypeDef, unknown> =
  z.string().transform((val, ctx) => {
    const result = EmailAddress.create(val);
    if (result.isErr()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          result.error instanceof ValidationError
            ? result.error.message
            : "Invalid email address",
      });
      return z.NEVER;
    }
    return result.value;
  });
