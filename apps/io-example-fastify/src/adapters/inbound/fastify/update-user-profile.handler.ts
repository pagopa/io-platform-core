import { mountEndpoint } from "@pagopa/io-core-adapter-fastify";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import type { UpdateUserProfileUseCase } from "../../../application/use-cases/update-user-profile.use-case.js";
import type { UpdateUserProfileData } from "../generated/api-types/index.js";

import { EmailAddressSchema } from "./zod-entities/emailAddress.zod-entity.js";
import { FiscalCodeSchema } from "./zod-entities/fiscalCode.zod-entity.js";

type InputDTO = Omit<UpdateUserProfileData, "url">;

const UpdateUserProfileSchema = (
  z.object({
    body: z.object({
      email: EmailAddressSchema.optional(),
      name: z.string().min(1).optional(),
    }),
    headers: z.object({
      "x-fiscal-code": FiscalCodeSchema,
    }),
  }) satisfies z.ZodType<InputDTO, z.ZodTypeDef, unknown>
).transform((input) => ({
  email: input.body.email,
  fiscalCode: input.headers["x-fiscal-code"],
  name: input.body.name,
}));

export const mountUpdateUserProfileHandler = (
  fastifyServer: FastifyInstance,
  useCase: UpdateUserProfileUseCase,
) => {
  mountEndpoint(fastifyServer, {
    method: "PUT",
    path: "/api/user-profiles",
    schema: UpdateUserProfileSchema,
    useCase,
  });
};
