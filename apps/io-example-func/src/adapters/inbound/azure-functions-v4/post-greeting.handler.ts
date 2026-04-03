import { app } from "@azure/functions";
import {
  createRequestValidator,
  GetHttpHandler,
} from "@pagopa/io-core-azure-functions-v4-adapter";
import { z } from "zod";

import { GreetingUseCase } from "../../../application/use-cases/greeting.use-case";

/**
 * Zod schema that validates HTTP request input.
 * Extracts `name` from request body.
 */
const PostGreetingSchema = z
  .object({
    body: z.object({
      name: z.string().min(1),
    }),
  })
  .transform((input) => ({
    name: input.body.name,
  }));

/**
 *
 * @param useCase
 */
export const mountPostGreetingHandler = (useCase: GreetingUseCase) => {
  const inputValidator = createRequestValidator(PostGreetingSchema);

  app.http("PostGreeting", {
    authLevel: "function",
    handler: GetHttpHandler(useCase, inputValidator),
    methods: ["POST"],
    route: "greetings",
  });
};
