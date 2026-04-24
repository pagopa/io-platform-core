import type { FiscalCode } from "@pagopa/io-core-domain";
import type {
  ConflictError,
  GenericError,
  NotFoundError,
} from "@pagopa/io-core-domain/errors";
import type { Result } from "neverthrow";

import type {
  NewUserProfile,
  UserProfile,
} from "../../../entities/user-profile.entity.js";

export interface IUserProfileRepository {
  readonly create: (
    profile: NewUserProfile,
  ) => Promise<Result<UserProfile, ConflictError | GenericError>>;

  readonly delete: (
    fiscalCode: FiscalCode,
  ) => Promise<Result<UserProfile, GenericError | NotFoundError>>;

  readonly findByFiscalCode: (
    fiscalCode: FiscalCode,
  ) => Promise<Result<UserProfile, GenericError | NotFoundError>>;

  readonly update: (
    fiscalCode: FiscalCode,
    data: Partial<Pick<UserProfile, "email" | "name">>,
  ) => Promise<Result<UserProfile, GenericError | NotFoundError>>;
}
