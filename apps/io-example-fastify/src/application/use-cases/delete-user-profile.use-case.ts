import type {
  GenericError,
  NotFoundError,
  ValidationError,
} from "@pagopa/io-core-domain/errors";

import { FiscalCodeSchema, type UseCase } from "@pagopa/io-core-domain";
import { ValidationError as ValidationErrorClass } from "@pagopa/io-core-domain/errors";
import { err } from "neverthrow";

import type { UserProfile } from "../../domain/entities/user-profile.entity.js";
import type { IUserProfileRepository } from "../../domain/ports/outbound/persistence/user-profile.repository.js";

export interface DeleteUserProfileInput {
  fiscalCode: string;
}

export type DeleteUserProfileUseCase = UseCase<
  DeleteUserProfileInput,
  UserProfile,
  GenericError | NotFoundError | ValidationError
>;

export const makeDeleteUserProfileUseCase =
  (repository: IUserProfileRepository): DeleteUserProfileUseCase =>
  async ({ fiscalCode }) => {
    const parseResult = FiscalCodeSchema.safeParse(fiscalCode);
    if (!parseResult.success) {
      return err(new ValidationErrorClass("Invalid input"));
    }

    const validFiscalCode = parseResult.data;
    return repository.delete(validFiscalCode);
  };
