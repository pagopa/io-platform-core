import { app } from "@azure/functions";
import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-azure-functions-v4";
import { z } from "zod";

import type { CreateUserProfileUseCase } from "../../../application/use-cases/create-user-profile.use-case.js";

import { NewUserProfileSchema } from "../../../domain/entities/user-profile.entity.js";
import { UserProfileResponseSchema } from "./zod-entities/userProfileResponse.zod-entity.js";

const CreateUserProfileInputSchema = z
  // Extract input from headers
  .object({
    body: NewUserProfileSchema.extend({
      birthDate: z.string().pipe(z.coerce.date()),
    }),
  })
  // Transform the input to match the use case's expected input
  .transform((input) => input.body);

export const mountCreateUserProfileHandler = (
  useCase: CreateUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(
    CreateUserProfileInputSchema,
  );
  const outputFormatter = createHttpResponseFormatter(
    UserProfileResponseSchema,
  );

  app.http("CreateUserProfile", {
    authLevel: "function",
    handler: createHttpHandler(useCase, inputValidator, outputFormatter, {
      successCode: 201,
    }),
    methods: ["POST"],
    route: "user-profiles",
  });
};
