import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-fastify";
import { FastifyInstance } from "fastify";
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
  fastifyServer: FastifyInstance,
  useCase: DeleteUserProfileUseCase,
) => {
  fastifyServer.delete(
    "/api/user-profiles",
    createHttpHandler(useCase, inputValidator, outputFormatter),
  );
};
