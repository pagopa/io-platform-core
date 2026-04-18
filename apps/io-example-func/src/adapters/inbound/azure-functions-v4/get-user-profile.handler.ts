import { app } from "@azure/functions";
import { mountEndpoint } from "@pagopa/io-core-adapter-azure-functions-v4";
import { z } from "zod";

import type { GetUserProfileUseCase } from "../../../application/use-cases/get-user-profile.use-case.js";

import { GetUserProfileData } from "../generated/api-types/types.gen.js";
import { FiscalCodeSchema } from "./zod-entities/fiscalCode.zod-entity.js";

type InputDTO = Omit<GetUserProfileData, "url">;

const GetUserProfileSchema = (
  z.object({
    headers: z.object({
      "x-fiscal-code": FiscalCodeSchema,
    }),
  }) satisfies z.ZodType<InputDTO, z.ZodTypeDef, unknown>
).transform((input) => ({
  fiscalCode: input.headers["x-fiscal-code"],
}));

export const mountGetUserProfileHandler = (useCase: GetUserProfileUseCase) => {
  mountEndpoint(app, {
    method: "GET",
    name: "GetUserProfile",
    path: "user-profiles",
    schema: GetUserProfileSchema,
    useCase,
  });
};
