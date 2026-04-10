import type { EmailAddress, FiscalCode, UseCase } from "@pagopa/io-core-domain";
import type {
  ConflictError,
  GenericError,
} from "@pagopa/io-core-domain/errors";

import type { UserProfile } from "../../domain/entities/user-profile.entity.js";
import type { IUserProfileRepository } from "../../domain/ports/outbound/persistence/user-profile.repository.js";

export interface CreateUserProfileInput {
  email: EmailAddress;
  fiscalCode: FiscalCode;
  name: string;
}

export type CreateUserProfileUseCase = UseCase<
  CreateUserProfileInput,
  UserProfile,
  ConflictError | GenericError
>;

export const makeCreateUserProfileUseCase =
  (repository: IUserProfileRepository): CreateUserProfileUseCase =>
  async (input) =>
    repository.create(input);
