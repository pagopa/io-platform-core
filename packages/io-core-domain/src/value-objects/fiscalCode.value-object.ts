import { err, ok, Result } from "neverthrow";

import { ValidationError } from "../errors/index.js";
import { Brand } from "./brandedType.value-object.js";

export type FiscalCode = Brand<string>;

export const FiscalCode = {
  create: (value: string): Result<FiscalCode, ValidationError> => {
    const cfRegex =
      /^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/i;
    if (!cfRegex.test(value)) {
      return err(new ValidationError(`Invalid Fiscal Code '${value}'.`));
    }
    return ok(value as FiscalCode);
  },
};
