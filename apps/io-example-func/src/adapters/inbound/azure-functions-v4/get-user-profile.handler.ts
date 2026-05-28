import { app } from "@azure/functions";
import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-azure-functions-v4";
import { z } from "zod";

import type { GetUserProfileUseCase } from "../../../application/use-cases/get-user-profile.use-case.js";

import { zGetUserProfileHeaders } from "../generated/zod.gen.js";
import { UserProfileResponseSchema } from "./dto/userProfileResponse.zod-entity.js";

const GetUserProfileSchema = z
  .object({
    headers: zGetUserProfileHeaders,
  })
  // Transform the input to match the use case's expected input
  .transform((input) => ({
    fiscalCode: input.headers["x-fiscal-code"],
  }));

const inputValidator = createHttpRequestValidator(GetUserProfileSchema);
const outputFormatter = createHttpResponseFormatter(UserProfileResponseSchema);

export const mountGetUserProfileHandler = (useCase: GetUserProfileUseCase) => {
  app.http("GetUserProfile", {
    authLevel: "function",
    handler: createHttpHandler(useCase, inputValidator, outputFormatter),
    methods: ["GET"],
    route: "user-profiles",
  });
};
