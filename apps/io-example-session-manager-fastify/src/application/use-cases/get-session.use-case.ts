import type { UseCase } from "@pagopa/io-core-domain";
import type {
  AuthenticationError,
  GenericError,
} from "@pagopa/io-core-domain/errors";

import { GenericError as GenericErrorImpl } from "@pagopa/io-core-domain";
import { err } from "neverthrow";

export interface GetSessionInput {
  readonly authorization: string;
  readonly fields?: string;
}

export interface GetSessionOutput {
  readonly bpdToken?: string;
  readonly expirationDate?: string;
  readonly fimsToken?: string;
  readonly lollipopAssertionRef?: string;
  readonly myPortalToken?: string;
  readonly spidLevel?:
    | "https://www.spid.gov.it/SpidL1"
    | "https://www.spid.gov.it/SpidL2"
    | "https://www.spid.gov.it/SpidL3";
  readonly walletToken?: string;
  readonly zendeskToken?: string;
}

export type GetSessionUseCase = UseCase<
  GetSessionInput,
  GetSessionOutput,
  AuthenticationError | GenericError
>;

export const getSessionUseCase: GetSessionUseCase = async (_) =>
  err(new GenericErrorImpl("Not implemented"));
