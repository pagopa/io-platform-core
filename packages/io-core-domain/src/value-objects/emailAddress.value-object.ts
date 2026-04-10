import { err, ok, Result } from "neverthrow";

import { ValidationError } from "../errors/index.js";
import { Brand } from "./brandedType.value-object.js";

export type EmailAddress = Brand<string>;

export const EmailAddress = {
  create: (value: string): Result<EmailAddress, ValidationError> => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return err(new ValidationError(`Invalid email address '${value}'.`));
    }
    return ok(value.toLowerCase() as EmailAddress);
  },
};
