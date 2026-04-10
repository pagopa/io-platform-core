import { app } from "@azure/functions";
import {
  createHttpHandler,
  createHttpRequestValidator,
} from "@pagopa/io-core-adapter-azure-functions-v4";
import { z } from "zod";

import type { UpdateUserProfileUseCase } from "../../../application/use-cases/update-user-profile.use-case.js";

import { UpdateUserProfileData } from "../generated/api-types/types.gen.js";
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
  }) satisfies z.ZodType<InputDTO, any, unknown>
).transform((input) => ({
  email: input.body.email,
  fiscalCode: input.headers["x-fiscal-code"],
  name: input.body.name,
}));

export const mountUpdateUserProfileHandler = (
  useCase: UpdateUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(UpdateUserProfileSchema);

  app.http("UpdateUserProfile", {
    authLevel: "function",
    handler: createHttpHandler(useCase, inputValidator),
    methods: ["PUT"],
    route: "user-profiles",
  });
};
