import { app } from "@azure/functions";
import { mountEndpoint } from "@pagopa/io-core-adapter-azure-functions-v4";
import { z } from "zod";

import type { CreateUserProfileUseCase } from "../../../application/use-cases/create-user-profile.use-case.js";

import { CreateUserProfileData } from "../generated/api-types/types.gen.js";
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
  }) satisfies z.ZodType<InputDTO, z.ZodTypeDef, unknown>
).transform((input) => ({
  email: input.body.email,
  fiscalCode: input.body.fiscalCode,
  name: input.body.name,
}));

export const mountCreateUserProfileHandler = (
  useCase: CreateUserProfileUseCase,
) => {
  mountEndpoint(app, {
    method: "POST",
    name: "CreateUserProfile",
    path: "user-profiles",
    schema: CreateUserProfileSchema,
    successCode: 201,
    useCase,
  });
};
