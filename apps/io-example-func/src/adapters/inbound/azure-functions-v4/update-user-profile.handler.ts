import { app } from "@azure/functions";
import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-azure-functions-v4";
import { FiscalCodeSchema } from "@pagopa/io-core-domain";
import { z } from "zod";

import type { UpdateUserProfileUseCase } from "../../../application/use-cases/update-user-profile.use-case.js";

import { UserProfileSchema } from "../../../domain/entities/user-profile.entity.js";
import { UserProfileResponseSchema } from "./zod-entities/userProfileResponse.zod-entity.js";

const UpdateUserProfileSchema = z
  .object({
    body: UserProfileSchema.pick({ email: true, name: true }).partial(),
    headers: z.object({
      "x-fiscal-code": FiscalCodeSchema,
    }),
  })
  .transform((input) => ({
    email: input.body.email,
    fiscalCode: input.headers["x-fiscal-code"],
    name: input.body.name,
  }));

export const mountUpdateUserProfileHandler = (
  useCase: UpdateUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(UpdateUserProfileSchema);
  const outputFormatter = createHttpResponseFormatter(
    UserProfileResponseSchema,
  );

  app.http("UpdateUserProfile", {
    authLevel: "function",
    handler: createHttpHandler(useCase, inputValidator, outputFormatter),
    methods: ["PUT"],
    route: "user-profiles",
  });
};
