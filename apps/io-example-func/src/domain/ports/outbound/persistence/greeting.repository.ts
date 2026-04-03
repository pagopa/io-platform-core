import { GenericError, NotFoundError } from "@pagopa/io-core-domain/errors";
import { Result } from "neverthrow";

import { Greeting } from "../../../entities/greeting.entity.js";

export interface IGreetingRepository {
  readonly getByName: (
    name: string,
  ) => Promise<Result<Greeting, GenericError | NotFoundError>>;
}
