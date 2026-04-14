import {
  createHttpHandler,
  createHttpRequestValidator,
} from "@pagopa/io-core-adapter-fastify";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import type { DeleteUserProfileUseCase } from "../../../application/use-cases/delete-user-profile.use-case.js";
import type { DeleteUserProfileData } from "../generated/api-types/index.js";

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
  fastifyServer: FastifyInstance,
  useCase: DeleteUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(DeleteUserProfileSchema);
  fastifyServer.delete(
    "/api/user-profiles",
    createHttpHandler(useCase, inputValidator),
  );
};
