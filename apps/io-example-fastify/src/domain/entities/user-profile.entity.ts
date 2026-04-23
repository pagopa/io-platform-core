import type { EmailAddress, FiscalCode } from "@pagopa/io-core-domain";

import { UnprocessableEntityError } from "@pagopa/io-core-domain/errors";
import { err, ok, type Result } from "neverthrow";

export interface UserProfile {
  readonly birthDate: Date;
  readonly createdAt: Date;
  readonly email: EmailAddress;
  readonly fiscalCode: FiscalCode;
  readonly name: string;
  readonly updatedAt?: Date;
}

export const UserProfile = {
  create: (data: {
    readonly birthDate: Date;
    readonly email: EmailAddress;
    readonly fiscalCode: FiscalCode;
    readonly name: string;
  }): Result<UserProfile, UnprocessableEntityError> => {
    const ageValidation = validateAdultAge(data.birthDate);
    if (ageValidation.isErr()) {
      return err(ageValidation.error);
    }
    return ok({
      ...data,
      createdAt: new Date(),
    });
  },
};

const validateAdultAge = (
  birthDate: Date,
): Result<void, UnprocessableEntityError> => {
  const dataLimite = new Date();
  dataLimite.setFullYear(dataLimite.getFullYear() - 18);

  if (birthDate > dataLimite) {
    return err(
      new UnprocessableEntityError("User must be at least 18 years old"),
    );
  }
  return ok(undefined);
};
