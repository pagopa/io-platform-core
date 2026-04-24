import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-fastify";
import {
  EmailAddressSchema,
  FiscalCodeSchema,
  NonEmptyStringSchema,
} from "@pagopa/io-core-domain";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import type { CreateUserProfileUseCase } from "../../../application/use-cases/create-user-profile.use-case.js";

import { UserProfileResponseSchema } from "./dto/userProfileResponse.zod-entity.js";

const DateFromStringSchema = z.coerce.date();

const CreateUserProfileInputSchema = z
  // Extract input from headers
  .object({
    body: z.object({
      birthDate: DateFromStringSchema,
      email: EmailAddressSchema,
      fiscalCode: FiscalCodeSchema,
      name: NonEmptyStringSchema,
    }),
  })
  // Transform the input to match the use case's expected input
  .transform((input) => input.body);

const inputValidator = createHttpRequestValidator(CreateUserProfileInputSchema);
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
