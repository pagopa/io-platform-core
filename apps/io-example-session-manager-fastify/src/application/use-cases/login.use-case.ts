import type { UseCase } from "@pagopa/io-core-domain";
import type { GenericError } from "@pagopa/io-core-domain/errors";

import { GenericError as GenericErrorImpl } from "@pagopa/io-core-domain";
import { err } from "neverthrow";

export interface LoginInput {
  readonly authLevel: "SpidL2" | "SpidL3";
  readonly entityID: string;
  readonly loginType?: string;
  readonly "x-pagopa-current-user"?: string;
  readonly "x-pagopa-lollipop-pub-key"?: string;
  readonly "x-pagopa-lollipop-pub-key-hash-algo"?: string;
}

/**
 * Dummy output — GET /login responds with a 302 redirect in production.
 * The "200" success code is used only as a generator placeholder, matching
 * the convention used in the original external.yaml.
 */
export type LoginOutput = Record<string, never>;

export type LoginUseCase = UseCase<LoginInput, LoginOutput, GenericError>;

export const loginUseCase: LoginUseCase = async (_) =>
  err(new GenericErrorImpl("Not implemented"));
