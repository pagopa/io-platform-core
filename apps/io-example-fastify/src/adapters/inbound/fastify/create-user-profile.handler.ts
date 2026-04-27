import type { RouteRegistry } from "@pagopa/io-core-openapi";
import type { FastifyInstance } from "fastify";

import {
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-fastify";
import { defineRoute } from "@pagopa/io-core-openapi";

import type { CreateUserProfileUseCase } from "../../../application/use-cases/create-user-profile.use-case.js";

import {
  CreateUserProfileBodySchema,
  UserProfileResponseSchema,
} from "./dto/openapi-schemas.js";

const createUserProfileContract = defineRoute({
  description: "Creates a new user profile with the provided data.",
  method: "post",
  operationId: "createUserProfile",
  path: "/api/user-profiles",
  request: {
    body: CreateUserProfileBodySchema,
  },
  response: {
    201: {
      description: "User profile created successfully.",
      schema: UserProfileResponseSchema,
    },
    400: ProblemJson,
    409: ProblemJson,
    422: ProblemJson,
    500: ProblemJson,
  },
  security: [{ functionKey: [] }],
  summary: "Create a new user profile",
  tags: ["UserProfiles"],
});

export const mountCreateUserProfileHandler = (
  server: FastifyInstance,
  useCase: CreateUserProfileUseCase,
  registry?: RouteRegistry,
): void => {
  mountFastifyRoute(server, {
    contract: createUserProfileContract,
    registry,
    transformInput: ({ body }) => body,
    useCase,
  });
};
