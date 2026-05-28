import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-fastify";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import type { CreateUserProfileUseCase } from "../../../application/use-cases/create-user-profile.use-case.js";

import { zCreateUserProfileBody } from "../generated/zod.gen.js";
import { UserProfileResponseSchema } from "./dto/userProfileResponse.zod-entity.js";

const CreateUserProfileInputSchema = z
  .object({
    body: zCreateUserProfileBody,
  })
  // Transform the input to match the use case's expected input
  .transform((input) => ({
    birthDate: new Date(input.body.birthDate),
    email: input.body.email,
    fiscalCode: input.body.fiscalCode,
    name: input.body.name,
  }));

const inputValidator = createHttpRequestValidator(CreateUserProfileInputSchema);
//TODO: use zCreateUserProfileResponse to validate the output of the use case,
// and transform it to the expected output format (e.g. convert Date to string)
const outputFormatter = createHttpResponseFormatter(UserProfileResponseSchema);

export const mountCreateUserProfileHandler = (
  fastifyServer: FastifyInstance,
  useCase: CreateUserProfileUseCase,
) => {
  fastifyServer.post(
    "/api/user-profiles",
    createHttpHandler(useCase, inputValidator, outputFormatter, {
      successCode: 201,
    }),
  );
};
