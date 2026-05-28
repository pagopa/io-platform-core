import { app } from "@azure/functions";
import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-azure-functions-v4";
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
const outputFormatter = createHttpResponseFormatter(UserProfileResponseSchema);

export const mountCreateUserProfileHandler = (
  useCase: CreateUserProfileUseCase,
) => {
  app.http("CreateUserProfile", {
    authLevel: "function",
    handler: createHttpHandler(useCase, inputValidator, outputFormatter, {
      successCode: 201,
    }),
    methods: ["POST"],
    route: "user-profiles",
  });
};
