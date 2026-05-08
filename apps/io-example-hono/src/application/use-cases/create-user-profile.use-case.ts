import type { UseCase } from "@pagopa/io-core-domain";
import type {
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
  ConflictError | GenericError | UnprocessableEntityError
>;

export const makeCreateUserProfileUseCase =
  (repository: IUserProfileRepository): CreateUserProfileUseCase =>
  async (input) => {
    const ageCheck = validateAdultAge(input.birthDate);
    if (ageCheck.isErr()) return err(ageCheck.error);
    return repository.create(input);
  };
