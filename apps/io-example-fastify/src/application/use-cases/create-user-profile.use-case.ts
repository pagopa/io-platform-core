import type { EmailAddress, FiscalCode, UseCase } from "@pagopa/io-core-domain";
import type {
  ConflictError,
  GenericError,
  UnprocessableEntityError,
} from "@pagopa/io-core-domain/errors";
import { err } from "neverthrow";

import type { UserProfile } from "../../domain/entities/user-profile.entity.js";
import type { IUserProfileRepository } from "../../domain/ports/outbound/persistence/user-profile.repository.js";

import { validateAdultAge } from "../../domain/entities/user-profile.entity.js";

export interface CreateUserProfileInput {
  birthDate: Date;
  email: EmailAddress;
  fiscalCode: FiscalCode;
  name: string;
}

export type CreateUserProfileUseCase = UseCase<
  CreateUserProfileInput,
  UserProfile,
  ConflictError | GenericError | UnprocessableEntityError
>;

export const makeCreateUserProfileUseCase =
  (repository: IUserProfileRepository): CreateUserProfileUseCase =>
  async (input) => {
    const ageValidation = validateAdultAge(input.birthDate);
    if (ageValidation.isErr()) {
      return err(ageValidation.error);
    }
    return repository.create(input);
  };
