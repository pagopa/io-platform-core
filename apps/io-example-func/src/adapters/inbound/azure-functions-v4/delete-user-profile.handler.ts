import { app } from "@azure/functions";
import {
  createHttpHandler,
  createHttpRequestValidator,
} from "@pagopa/io-core-adapter-azure-functions-v4";
import { z } from "zod";

import type { DeleteUserProfileUseCase } from "../../../application/use-cases/delete-user-profile.use-case.js";

import { DeleteUserProfileData } from "../generated/api-types/types.gen.js";
import { FiscalCodeSchema } from "./zod-entities/fiscalCode.zod-entity.js";

type InputDTO = Omit<DeleteUserProfileData, "url">;

const DeleteUserProfileSchema = (
  z.object({
    headers: z.object({
      "x-fiscal-code": FiscalCodeSchema,
    }),
  }) satisfies z.ZodType<InputDTO, z.ZodTypeDef, unknown>
).transform((input) => ({
  fiscalCode: input.headers["x-fiscal-code"],
}));

export const mountDeleteUserProfileHandler = (
  useCase: DeleteUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(DeleteUserProfileSchema);

  app.http("DeleteUserProfile", {
    authLevel: "function",
    handler: createHttpHandler(useCase, inputValidator),
    methods: ["DELETE"],
    route: "user-profiles",
  });
};
