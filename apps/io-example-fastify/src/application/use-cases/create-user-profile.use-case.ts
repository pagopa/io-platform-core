import type { UseCase } from "@pagopa/io-core-domain";

import {
  ConflictError,
  GenericError,
  UnprocessableEntityError,
} from "@pagopa/io-core-domain/errors";
import { err } from "neverthrow";

import type { IUserProfileRepository } from "../../domain/ports/outbound/persistence/user-profile.repository.js";

import {
  type NewUserProfile,
  type UserProfile,
  validateAdultAge,
} from "../../domain/entities/user-profile.entity.js";

export type CreateUserProfileInput = NewUserProfile;

export type CreateUserProfileUseCase = UseCase<
  CreateUserProfileInput,
  UserProfile,
  ConflictError | CustomUnprocessableEntityError | GenericError
>;

class CustomUnprocessableEntityError extends UnprocessableEntityError {
  override readonly tag = "custom-validation" as const;
}

export const makeCreateUserProfileUseCase =
  (repository: IUserProfileRepository): CreateUserProfileUseCase =>
  async (input) => {
    const ageCheck = validateAdultAge(input.birthDate);
    if (ageCheck.isErr())
      return err(new CustomUnprocessableEntityError("User must be an adult"));

    return repository.create(input);
  };
