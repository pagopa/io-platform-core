import type {
  EmailAddress,
  FiscalCode,
  NonEmptyString,
  UseCase,
} from "@pagopa/io-core-domain";
import type {
  GenericError,
  NotFoundError,
} from "@pagopa/io-core-domain/errors";

import type { UserProfile } from "../../domain/entities/user-profile.entity.js";
import type { IUserProfileRepository } from "../../domain/ports/outbound/persistence/user-profile.repository.js";

export interface UpdateUserProfileInput {
  email?: EmailAddress;
  fiscalCode: FiscalCode;
  name?: NonEmptyString;
}

export type UpdateUserProfileUseCase = UseCase<
  UpdateUserProfileInput,
  UserProfile,
  GenericError | NotFoundError
>;

export const makeUpdateUserProfileUseCase =
  (repository: IUserProfileRepository): UpdateUserProfileUseCase =>
  async (input) =>
    repository.update(input.fiscalCode, {
      email: input.email,
      name: input.name,
    });
