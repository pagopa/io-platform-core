import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-fastify";
import { FiscalCodeSchema } from "@pagopa/io-core-domain";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import type { UpdateUserProfileUseCase } from "../../../application/use-cases/update-user-profile.use-case.js";

import { UserProfileSchema } from "../../../domain/entities/user-profile.entity.js";
import { UserProfileResponseSchema } from "./dto/userProfileResponse.zod-entity.js";

const UpdateUserProfileSchema = z
  // Extract input from headers
  .object({
    body: UserProfileSchema.pick({ email: true, name: true }).partial(),
    headers: z.object({
      "x-fiscal-code": FiscalCodeSchema,
    }),
  })
  // Transform the input to match the use case's expected input
  .transform((input) => ({
    email: input.body.email,
    fiscalCode: input.headers["x-fiscal-code"],
    name: input.body.name,
  }));

const inputValidator = createHttpRequestValidator(UpdateUserProfileSchema);
const outputFormatter = createHttpResponseFormatter(UserProfileResponseSchema);

export const mountUpdateUserProfileHandler = (
  fastifyServer: FastifyInstance,
  useCase: UpdateUserProfileUseCase,
) => {
  fastifyServer.put(
    "/api/user-profiles",
    createHttpHandler(useCase, inputValidator, outputFormatter),
  );
};
