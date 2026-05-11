import type { RouteRegistry } from "@pagopa/io-core-openapi";
import type { FastifyInstance } from "fastify";

import {
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-fastify";
import { defineRoute } from "@pagopa/io-core-openapi";

import type { GetUserIdentityUseCase } from "../../../application/use-cases/get-user-identity.use-case.js";

import {
  BearerAuthHeaderSchema,
  UserIdentityWithTtl,
} from "./dto/openapi-schemas.js";

const getUserIdentityContract = defineRoute({
  description:
    "Introspect the session token and returns the related user identity.",
  method: "get",
  operationId: "getUserIdentity",
  path: "/api/auth/v1/user-identity",
  request: {
    headers: BearerAuthHeaderSchema,
  },
  response: {
    200: {
      description: "User identity returned successfully.",
      schema: UserIdentityWithTtl,
    },
    400: ProblemJson,
    401: ProblemJson,
    500: ProblemJson,
  },
  security: [{ Bearer: [] }],
  summary: "Session token introspection",
  tags: ["Session"],
});

export const mountGetUserIdentityHandler = (
  server: FastifyInstance,
  useCase: GetUserIdentityUseCase,
  registry?: RouteRegistry,
): void => {
  mountFastifyRoute(server, {
    contract: getUserIdentityContract,
    registry,
    transformInput: ({ headers }) => ({
      authorization: headers.authorization,
    }),
    useCase,
  });
};
