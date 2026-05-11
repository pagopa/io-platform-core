import type { UseCase } from "@pagopa/io-core-domain";
import type { GenericError } from "@pagopa/io-core-domain/errors";

import { GenericError as GenericErrorImpl } from "@pagopa/io-core-domain";
import { err } from "neverthrow";

export interface GenerateNonceOutput {
  readonly nonce: string;
}

export type GenerateNonceUseCase = UseCase<
  Record<string, never>,
  GenerateNonceOutput,
  GenericError
>;

export const generateNonceUseCase: GenerateNonceUseCase = async (_) =>
  err(new GenericErrorImpl("Not implemented"));
