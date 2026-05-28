import {
  createHttpHandler,
  createHttpRequestValidator,
  createHttpResponseFormatter,
} from "@pagopa/io-core-adapter-fastify";
import { FastifyInstance } from "fastify";
import { z } from "zod";

import type { GetUserProfileUseCase } from "../../../application/use-cases/get-user-profile.use-case.js";

import { zGetUserProfileHeaders } from "../generated/zod.gen.js";
import { UserProfileResponseSchema } from "./dto/userProfileResponse.zod-entity.js";

const GetUserProfileSchema = z
  .object({
    headers: zGetUserProfileHeaders,
  })
  // Transform the input to match the use case's expected input
  .transform((input) => ({
    fiscalCode: input.headers["x-fiscal-code"],
  }));

const inputValidator = createHttpRequestValidator(GetUserProfileSchema);
const outputFormatter = createHttpResponseFormatter(UserProfileResponseSchema);

export const mountGetUserProfileHandler = (
  fastifyServer: FastifyInstance,
  useCase: GetUserProfileUseCase,
) => {
  fastifyServer.get(
    "/api/user-profiles",
    createHttpHandler(useCase, inputValidator, outputFormatter),
  );
};
