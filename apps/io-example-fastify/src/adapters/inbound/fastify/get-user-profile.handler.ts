import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-fastify";
import { FiscalCodeSchema } from "@pagopa/io-core-domain";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import type { GetUserProfileUseCase } from "../../../application/use-cases/get-user-profile.use-case.js";

import { UserProfileResponseSchema } from "./zod-entities/userProfileResponse.zod-entity.js";

const GetUserProfileSchema = z
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

export const mountGetUserProfileHandler = (
  fastifyServer: FastifyInstance,
  useCase: GetUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(GetUserProfileSchema);
  const outputFormatter = createHttpResponseFormatter(
    UserProfileResponseSchema,
  );

  fastifyServer.get(
    "/api/user-profiles",
    createHttpHandler(useCase, inputValidator, outputFormatter),
  );
};
