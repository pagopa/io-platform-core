import type { UseCase } from "@pagopa/io-core-domain";
import type {
  AuthenticationError,
  ForbiddenError,
  GenericError,
} from "@pagopa/io-core-domain/errors";

import { GenericError as GenericErrorImpl } from "@pagopa/io-core-domain";
import { err } from "neverthrow";

export interface FastLoginInput {
  readonly headers: {
    readonly signature: string;
    readonly "signature-input": string;
    readonly "x-pagopa-lollipop-original-method": string;
    readonly "x-pagopa-lollipop-original-url": string;
  };
}

export interface FastLoginOutput {
  readonly token: string;
}

export type FastLoginUseCase = UseCase<
  FastLoginInput,
  FastLoginOutput,
  AuthenticationError | ForbiddenError | GenericError
>;

export const fastLoginUseCase: FastLoginUseCase = async (_) =>
  err(new GenericErrorImpl("Not implemented"));
