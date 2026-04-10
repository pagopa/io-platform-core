import type { FiscalCode, UseCase } from "@pagopa/io-core-domain";
import type {
  GenericError,
  NotFoundError,
} from "@pagopa/io-core-domain/errors";

import { Greeting } from "../../domain/entities/greeting.entity.js";
import { IGreetingRepository } from "../../domain/ports/outbound/persistence/greeting.repository.js";

export interface GreetingInput {
  fiscalCode: FiscalCode;
  name: string;
}

export type GreetingUseCase = UseCase<
  GreetingInput,
  Greeting,
  GenericError | NotFoundError
>;

export const makeGreetingUseCase =
  (repository: IGreetingRepository): GreetingUseCase =>
  async (input) =>
    repository.getByName(input.name);
