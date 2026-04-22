import { Result } from "neverthrow";
import z from "zod";

import { ValidationError } from "../errors/index.js";

export const fromValueObject = <TInput, TOutput>(
  create: (value: TInput) => Result<TOutput, ValidationError>,
  fallbackMessage: string,
): z.ZodType<TOutput, z.ZodTypeDef, TInput> =>
  z.any().transform((val: TInput, ctx) => {
    const result = create(val);
    if (result.isErr()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          result.error instanceof ValidationError
            ? result.error.message
            : fallbackMessage,
      });
      return z.NEVER;
    }
    return result.value;
  }) as z.ZodType<TOutput, z.ZodTypeDef, TInput>;
