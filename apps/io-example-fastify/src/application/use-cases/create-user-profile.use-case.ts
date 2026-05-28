import type { UseCase } from "@pagopa/io-core-domain";
import type {
  ConflictError,
  GenericError,
  UnprocessableEntityError,
  ValidationError,
} from "@pagopa/io-core-domain/errors";

import { ValidationError as ValidationErrorClass } from "@pagopa/io-core-domain/errors";
import { err } from "neverthrow";

import type { IUserProfileRepository } from "../../domain/ports/outbound/persistence/user-profile.repository.js";

import {
  NewUserProfileSchema,
  type UserProfile,
  validateAdultAge,
} from "../../domain/entities/user-profile.entity.js";

export interface CreateUserProfileInput {
  birthDate: Date;
  email: string;
  fiscalCode: string;
  name: string;
}

export type CreateUserProfileUseCase = UseCase<
  CreateUserProfileInput,
  UserProfile,
  ConflictError | GenericError | UnprocessableEntityError | ValidationError
>;

export const makeCreateUserProfileUseCase =
  (repository: IUserProfileRepository): CreateUserProfileUseCase =>
  async (input) => {
    const parseResult = NewUserProfileSchema.safeParse(input);
    if (!parseResult.success) {
      return err(new ValidationErrorClass("Invalid input"));
    }
    const validInput = parseResult.data;

    const ageCheck = validateAdultAge(validInput.birthDate);
    if (ageCheck.isErr()) return err(ageCheck.error);

    return repository.create(validInput);
  };
