import type { FiscalCode, UseCase } from "@pagopa/io-core-domain";
import type {
  GenericError,
  NotFoundError,
} from "@pagopa/io-core-domain/errors";

import type { UserProfile } from "../../domain/entities/user-profile.entity.js";
import type { IUserProfileRepository } from "../../domain/ports/outbound/persistence/user-profile.repository.js";

export interface GetUserProfileInput {
  fiscalCode: FiscalCode;
}

export type GetUserProfileUseCase = UseCase<
  GetUserProfileInput,
  UserProfile,
  GenericError | NotFoundError
>;

export const makeGetUserProfileUseCase =
  (repository: IUserProfileRepository): GetUserProfileUseCase =>
  async (input) =>
    repository.findByFiscalCode(input.fiscalCode);
