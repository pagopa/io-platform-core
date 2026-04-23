import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-fastify";
import { FastifyInstance } from "fastify";
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
  fastifyServer: FastifyInstance,
  useCase: DeleteUserProfileUseCase,
) => {
  const inputValidator = createHttpRequestValidator(DeleteUserProfileSchema);
  const outputFormatter = createHttpResponseFormatter(
    UserProfileResponseSchema,
  );
  fastifyServer.delete(
    "/api/user-profiles",
    createHttpHandler(useCase, inputValidator, outputFormatter),
  );
};
