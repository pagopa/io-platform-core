import type { FiscalCode, UseCase } from "@pagopa/io-core-domain";
import type {
  GenericError,
  NotFoundError,
} from "@pagopa/io-core-domain/errors";

import type { UserProfile } from "../../domain/entities/user-profile.entity.js";
import type { IUserProfileRepository } from "../../domain/ports/outbound/persistence/user-profile.repository.js";

export interface DeleteUserProfileInput {
  fiscalCode: FiscalCode;
}

export type DeleteUserProfileUseCase = UseCase<
  DeleteUserProfileInput,
  UserProfile,
  GenericError | NotFoundError
>;

export const makeDeleteUserProfileUseCase =
  (repository: IUserProfileRepository): DeleteUserProfileUseCase =>
  async (input) =>
    repository.delete(input.fiscalCode);
