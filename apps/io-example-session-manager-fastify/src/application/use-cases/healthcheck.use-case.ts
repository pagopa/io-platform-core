import type { UseCase } from "@pagopa/io-core-domain";
import type { GenericError } from "@pagopa/io-core-domain/errors";

import { GenericError as GenericErrorImpl } from "@pagopa/io-core-domain";
import { err } from "neverthrow";

export interface HealthcheckOutput {
  readonly version?: string;
}

export type HealthcheckUseCase = UseCase<
  Record<string, never>,
  HealthcheckOutput,
  GenericError
>;

export const healthcheckUseCase: HealthcheckUseCase = async (_) =>
  err(new GenericErrorImpl("Not implemented"));
