import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-fastify";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import type { CreateUserProfileUseCase } from "../../../application/use-cases/create-user-profile.use-case.js";

import { NewUserProfileSchema } from "../../../domain/entities/user-profile.entity.js";
import { UserProfileResponseSchema } from "./zod-entities/userProfileResponse.zod-entity.js";

const CreateUserProfileInputSchema = z
  // Extract input from headers
  .object({
    body: NewUserProfileSchema.extend({
      birthDate: z.string().pipe(z.coerce.date()),
    }),
  })
  // Transform the input to match the use case's expected input
  .transform((input) => input.body);

export const mountCreateUserProfileHandler = (
  fastifyServer: FastifyInstance,
  useCase: CreateUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(
    CreateUserProfileInputSchema,
  );
  const outputFormatter = createHttpResponseFormatter(
    UserProfileResponseSchema,
  );

  fastifyServer.post(
    "/api/user-profiles",
    createHttpHandler(useCase, inputValidator, outputFormatter, {
      successCode: 201,
    }),
  );
};
