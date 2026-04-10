import {
  createHttpHandler,
  createHttpRequestValidator,
} from "@pagopa/io-core-adapter-fastify";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import type { CreateUserProfileUseCase } from "../../../application/use-cases/create-user-profile.use-case.js";
import type { CreateUserProfileData } from "../generated/api-types/index.js";

import { EmailAddressSchema } from "./zod-entities/emailAddress.zod-entity.js";
import { FiscalCodeSchema } from "./zod-entities/fiscalCode.zod-entity.js";

type InputDTO = Omit<CreateUserProfileData, "url">;

const CreateUserProfileSchema = (
  z.object({
    body: z.object({
      email: EmailAddressSchema,
      fiscalCode: FiscalCodeSchema,
      name: z.string().min(1),
    }),
  }) satisfies z.ZodType<InputDTO, any, unknown>
).transform((input) => ({
  email: input.body.email,
  fiscalCode: input.body.fiscalCode,
  name: input.body.name,
}));

export const mountCreateUserProfileHandler = (
  fastifyServer: FastifyInstance,
  useCase: CreateUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(CreateUserProfileSchema);

  fastifyServer.post(
    "/api/user-profiles",
    createHttpHandler(useCase, inputValidator),
  );
};
