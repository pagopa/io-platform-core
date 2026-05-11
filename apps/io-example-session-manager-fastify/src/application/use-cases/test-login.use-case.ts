import type { UseCase } from "@pagopa/io-core-domain";
import type {
  AuthenticationError,
  GenericError,
} from "@pagopa/io-core-domain/errors";

import { GenericError as GenericErrorImpl } from "@pagopa/io-core-domain";
import { err } from "neverthrow";

export interface TestLoginInput {
  readonly password: string;
  readonly username: string;
}

export interface TestLoginOutput {
  readonly token: string;
}

export type TestLoginUseCase = UseCase<
  TestLoginInput,
  TestLoginOutput,
  AuthenticationError | GenericError
>;

export const testLoginUseCase: TestLoginUseCase = async (_) =>
  err(new GenericErrorImpl("Not implemented"));
