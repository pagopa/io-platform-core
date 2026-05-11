import type { UseCase } from "@pagopa/io-core-domain";
import type {
  AuthenticationError,
  GenericError,
} from "@pagopa/io-core-domain/errors";

import { GenericError as GenericErrorImpl } from "@pagopa/io-core-domain";
import { err } from "neverthrow";

export interface GetUserIdentityInput {
  readonly authorization: string;
}

export interface GetUserIdentityOutput {
  readonly assertion_ref?: string;
  readonly created_at: number;
  readonly date_of_birth: string;
  readonly family_name: string;
  readonly fiscal_code: string;
  readonly name: string;
  readonly session_tracking_id?: string;
  readonly spid_email?: string;
  readonly spid_idp?: string;
  readonly spid_level:
    | "https://www.spid.gov.it/SpidL1"
    | "https://www.spid.gov.it/SpidL2"
    | "https://www.spid.gov.it/SpidL3";
  readonly token_remaining_ttl: number;
}

export type GetUserIdentityUseCase = UseCase<
  GetUserIdentityInput,
  GetUserIdentityOutput,
  AuthenticationError | GenericError
>;

export const getUserIdentityUseCase: GetUserIdentityUseCase = async (_) =>
  err(new GenericErrorImpl("Not implemented"));
