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

export interface GetUserProfileInput {
  fiscalCode: string;
}

export type GetUserProfileUseCase = UseCase<
  GetUserProfileInput,
  UserProfile,
  GenericError | NotFoundError | ValidationError
>;

export const makeGetUserProfileUseCase =
  (repository: IUserProfileRepository): GetUserProfileUseCase =>
  async ({ fiscalCode }) => {
    const parseResult = FiscalCodeSchema.safeParse(fiscalCode);
    if (!parseResult.success) {
      return err(new ValidationErrorClass("Invalid input"));
    }
    return repository.findByFiscalCode(parseResult.data);
  };
