import {
  createHttpHandler,
  createHttpRequestValidator,
} from "@pagopa/io-core-adapter-fastify";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import type { GetUserProfileUseCase } from "../../../application/use-cases/get-user-profile.use-case.js";
import type { GetUserProfileData } from "../generated/api-types/index.js";

import { FiscalCodeSchema } from "./zod-entities/fiscalCode.zod-entity.js";

type InputDTO = Omit<GetUserProfileData, "url">;

const GetUserProfileSchema = (
  z.object({
    headers: z.object({
      "x-fiscal-code": FiscalCodeSchema,
    }),
  }) satisfies z.ZodType<InputDTO, any, unknown>
).transform((input) => ({
  fiscalCode: input.headers["x-fiscal-code"],
}));

export const mountGetUserProfileHandler = (
  fastifyServer: FastifyInstance,
  useCase: GetUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(GetUserProfileSchema);

  fastifyServer.get(
    "/api/user-profiles",
    createHttpHandler(useCase, inputValidator),
  );
};
