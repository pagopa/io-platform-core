import type { UseCase } from "@pagopa/io-core-domain";
import { ok } from "neverthrow";

interface InfoOutput {
  readonly name: string;
  readonly ok: boolean;
  readonly version: string;
}

export type InfoUseCase = UseCase<Record<string, never>, InfoOutput, never>;

export const getInfoUseCase: InfoUseCase = async () =>
  ok({ name: "io-example-hono", ok: true, version: "0.0.1" });
