import type { UseCase } from "@pagopa/io-core-domain";
import type {
  GenericError,
  NotFoundError,
} from "@pagopa/io-core-domain/errors";

import { app } from "@azure/functions";
import {
  createRequestValidator,
  GetHttpHandler,
} from "@pagopa/io-core-azure-functions-v4-adapter";
import { z } from "zod";

import { Greeting } from "../../../domain/entities/greeting.entity";

/**
 * Zod schema that validates HTTP request input.
 * Extracts `name` from route params.
 */
const GetGreetingSchema = z
  .object({
    params: z.object({
      name: z.string().min(1),
    }),
  })
  .transform((input) => ({
    name: input.params.name,
  }));

export const mountGetGreetingHandler = (
  useCase: UseCase<
    { readonly name: string },
    Greeting,
    GenericError | NotFoundError
  >,
) => {
  const inputValidator = createRequestValidator(GetGreetingSchema);

  app.http("GetGreeting", {
    authLevel: "anonymous",
    handler: GetHttpHandler(useCase, inputValidator),
    methods: ["GET"],
    route: "greetings/{name}",
  });
};
