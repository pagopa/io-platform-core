import type { UseCase } from "@pagopa/io-core-domain";
import type {
  GenericError,
  NotFoundError,
} from "@pagopa/io-core-domain/errors";

import { Greeting } from "../../domain/entities/greeting.entity.js";
import { IGreetingRepository } from "../../domain/ports/outbound/persistence/greeting.repository.js";

export interface GetGreetingInput {
  readonly name: string;
}

export type GetGreetingUseCase = UseCase<
  GetGreetingInput,
  Greeting,
  GenericError | NotFoundError
>;

export const makeGetGreetingUseCase =
  (repository: IGreetingRepository): GetGreetingUseCase =>
  async (input) =>
    repository.getByName(input.name);
