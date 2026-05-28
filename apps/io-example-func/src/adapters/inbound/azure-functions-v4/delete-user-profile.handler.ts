import { app } from "@azure/functions";
import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-azure-functions-v4";
import { z } from "zod";

import type { DeleteUserProfileUseCase } from "../../../application/use-cases/delete-user-profile.use-case.js";

import { zDeleteUserProfileHeaders } from "../generated/zod.gen.js";
import { UserProfileResponseSchema } from "./dto/userProfileResponse.zod-entity.js";

const DeleteUserProfileInputSchema = z
  .object({
    headers: zDeleteUserProfileHeaders,
  })
  // Transform the input to match the use case's expected input
  .transform((input) => ({
    fiscalCode: input.headers["x-fiscal-code"],
  }));

const inputValidator = createHttpRequestValidator(DeleteUserProfileInputSchema);
const outputFormatter = createHttpResponseFormatter(UserProfileResponseSchema);

export const mountDeleteUserProfileHandler = (
  useCase: DeleteUserProfileUseCase,
) => {
  app.http("DeleteUserProfile", {
    authLevel: "function",
    handler: createHttpHandler(useCase, inputValidator, outputFormatter),
    methods: ["DELETE"],
    route: "user-profiles",
  });
};
