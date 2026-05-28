import type {
  GenericError,
  NotFoundError,
  ValidationError,
} from "@pagopa/io-core-domain/errors";

import {
  EmailAddressSchema,
  FiscalCodeSchema,
  NonEmptyStringSchema,
  type UseCase,
} from "@pagopa/io-core-domain";
import { ValidationError as ValidationErrorClass } from "@pagopa/io-core-domain/errors";
import { err } from "neverthrow";
import { z } from "zod";

import type { UserProfile } from "../../domain/entities/user-profile.entity.js";
import type { IUserProfileRepository } from "../../domain/ports/outbound/persistence/user-profile.repository.js";

export interface UpdateUserProfileInput {
  email?: string;
  fiscalCode: string;
  name?: string;
}

export type UpdateUserProfileUseCase = UseCase<
  UpdateUserProfileInput,
  UserProfile,
  GenericError | NotFoundError | ValidationError
>;

const UpdateUserProfileInputSchema = z.object({
  email: EmailAddressSchema.optional(),
  fiscalCode: FiscalCodeSchema,
  name: NonEmptyStringSchema.optional(),
});

export const makeUpdateUserProfileUseCase =
  (repository: IUserProfileRepository): UpdateUserProfileUseCase =>
  async (input) => {
    const parseResult = UpdateUserProfileInputSchema.safeParse(input);
    if (!parseResult.success) {
      return err(new ValidationErrorClass("Invalid input"));
    }
    const validInput = parseResult.data;
    return repository.update(validInput.fiscalCode, {
      email: validInput.email,
      name: validInput.name,
    });
  };
