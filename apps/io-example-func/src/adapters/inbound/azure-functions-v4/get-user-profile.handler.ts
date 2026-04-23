import { app } from "@azure/functions";
import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-azure-functions-v4";
import { FiscalCodeSchema } from "@pagopa/io-core-domain";
import { z } from "zod";

import type { GetUserProfileUseCase } from "../../../application/use-cases/get-user-profile.use-case.js";

import { UserProfileResponseSchema } from "./zod-entities/userProfileResponse.zod-entity.js";

const GetUserProfileSchema = z
  .object({
    headers: z.object({
      "x-fiscal-code": FiscalCodeSchema,
    }),
  })
  .transform((input) => ({
    fiscalCode: input.headers["x-fiscal-code"],
  }));

export const mountGetUserProfileHandler = (useCase: GetUserProfileUseCase) => {
  const inputValidator = createHttpRequestValidator(GetUserProfileSchema);
  const outputFormatter = createHttpResponseFormatter(
    UserProfileResponseSchema,
  );

  app.http("GetUserProfile", {
    authLevel: "function",
    handler: createHttpHandler(useCase, inputValidator, outputFormatter),
    methods: ["GET"],
    route: "user-profiles",
  });
};
