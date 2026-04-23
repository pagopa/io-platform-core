import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-fastify";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import type { CreateUserProfileUseCase } from "../../../application/use-cases/create-user-profile.use-case.js";

import { EmailAddressSchema } from "./zod-entities/emailAddress.zod-entity.js";
import { FiscalCodeSchema } from "./zod-entities/fiscalCode.zod-entity.js";
import { UserProfileResponseSchema } from "./zod-entities/userProfileResponse.zod-entity.js";

const CreateUserProfileSchema = z
  .object({
    body: z.object({
      birthDate: z.string().pipe(z.coerce.date()),
      email: EmailAddressSchema,
      fiscalCode: FiscalCodeSchema,
      name: z.string().min(1),
    }),
  })
  .transform((input) => ({
    birthDate: input.body.birthDate,
    email: input.body.email,
    fiscalCode: input.body.fiscalCode,
    name: input.body.name,
  }));

export const mountCreateUserProfileHandler = (
  fastifyServer: FastifyInstance,
  useCase: CreateUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(CreateUserProfileSchema);
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
