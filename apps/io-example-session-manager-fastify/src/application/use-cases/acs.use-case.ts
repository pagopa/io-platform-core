import type { UseCase } from "@pagopa/io-core-domain";
import type { GenericError } from "@pagopa/io-core-domain/errors";

import { GenericError as GenericErrorImpl } from "@pagopa/io-core-domain";
import { err } from "neverthrow";

export interface AcsInput {
  readonly samlResponse: string;
}

/**
 * Dummy output — POST /assertionConsumerService responds with a 301 redirect
 * in production. The "200" success code is used only as a generator
 * placeholder, matching the convention in the original external.yaml.
 */
export type AcsOutput = Record<string, never>;

export type AcsUseCase = UseCase<AcsInput, AcsOutput, GenericError>;

export const acsUseCase: AcsUseCase = async (_) =>
  err(new GenericErrorImpl("Not implemented"));
