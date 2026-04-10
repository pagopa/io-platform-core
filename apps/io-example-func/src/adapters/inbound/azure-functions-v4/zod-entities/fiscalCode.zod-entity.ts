import { FiscalCode, ValidationError } from "@pagopa/io-core-domain";
import z from "zod";

export const FiscalCodeSchema: z.Schema<FiscalCode, z.ZodTypeDef, unknown> = z
  .string()
  .transform((val, ctx) => {
    const result = FiscalCode.create(val);
    if (result.isErr()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          result.error instanceof ValidationError
            ? result.error.message
            : "Invalid Fiscal Code",
      });
      return z.NEVER;
    }
    return result.value;
  });
