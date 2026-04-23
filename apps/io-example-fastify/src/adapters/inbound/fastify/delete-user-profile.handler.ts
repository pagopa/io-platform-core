import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-fastify";
import { FiscalCodeSchema } from "@pagopa/io-core-domain";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import type { DeleteUserProfileUseCase } from "../../../application/use-cases/delete-user-profile.use-case.js";

import { UserProfileResponseSchema } from "./zod-entities/userProfileResponse.zod-entity.js";

const DeleteUserProfileInputSchema = z
  // Extract input from headers
  .object({
    headers: z.object({
      "x-fiscal-code": FiscalCodeSchema,
    }),
  })
  // Transform the input to match the use case's expected input
  .transform((input) => ({
    fiscalCode: input.headers["x-fiscal-code"],
  }));

export const mountDeleteUserProfileHandler = (
  fastifyServer: FastifyInstance,
  useCase: DeleteUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(
    DeleteUserProfileInputSchema,
  );
  const outputFormatter = createHttpResponseFormatter(
    UserProfileResponseSchema,
  );
  fastifyServer.delete(
    "/api/user-profiles",
    createHttpHandler(useCase, inputValidator, outputFormatter),
  );
};
