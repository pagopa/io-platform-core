import type { UseCase } from "@pagopa/io-core-domain";
import type { BaseError } from "@pagopa/io-core-domain/errors";

import { ok } from "neverthrow";

interface InfoOutput {
  readonly name: string;
  readonly ok: boolean;
  readonly version: string;
}

export const getInfoUseCase: UseCase<
  Record<string, never>,
  InfoOutput,
  BaseError
> = async () =>
  ok({
    name: "io-example-func",
    ok: true,
    version: "0.0.1",
  });
