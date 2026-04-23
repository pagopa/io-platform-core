import type { EmailAddress, FiscalCode, UseCase } from "@pagopa/io-core-domain";
import type {
  ConflictError,
  GenericError,
  UnprocessableEntityError,
} from "@pagopa/io-core-domain/errors";

import { err } from "neverthrow";

import type { IUserProfileRepository } from "../../domain/ports/outbound/persistence/user-profile.repository.js";

import { UserProfile } from "../../domain/entities/user-profile.entity.js";

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
    const user = UserProfile.create(input);

    if (user.isErr()) {
      return err(user.error);
    }
    return repository.create(user.value);
  };
