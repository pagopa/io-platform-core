import type { UseCase } from "@pagopa/io-core-domain";
import type {
  AuthenticationError,
  GenericError,
} from "@pagopa/io-core-domain/errors";

import { GenericError as GenericErrorImpl } from "@pagopa/io-core-domain";
import { err } from "neverthrow";

export interface LogoutInput {
  readonly authorization: string;
}

export interface LogoutOutput {
  readonly message?: string;
}

export type LogoutUseCase = UseCase<
  LogoutInput,
  LogoutOutput,
  AuthenticationError | GenericError
>;

export const logoutUseCase: LogoutUseCase = async (_) =>
  err(new GenericErrorImpl("Not implemented"));
