import { app } from "@azure/functions";
import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-azure-functions-v4";
import { z } from "zod";

import type { DeleteUserProfileUseCase } from "../../../application/use-cases/delete-user-profile.use-case.js";

import { FiscalCodeSchema } from "./zod-entities/fiscalCode.zod-entity.js";
import { UserProfileResponseSchema } from "./zod-entities/userProfileResponse.zod-entity.js";

const DeleteUserProfileSchema = z
  .object({
    headers: z.object({
      "x-fiscal-code": FiscalCodeSchema,
    }),
  })
  .transform((input) => ({
    fiscalCode: input.headers["x-fiscal-code"],
  }));

export const mountDeleteUserProfileHandler = (
  useCase: DeleteUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(DeleteUserProfileSchema);
  const outputFormatter = createHttpResponseFormatter(
    UserProfileResponseSchema,
  );

  app.http("DeleteUserProfile", {
    authLevel: "function",
    handler: createHttpHandler(useCase, inputValidator, outputFormatter),
    methods: ["DELETE"],
    route: "user-profiles",
  });
};
