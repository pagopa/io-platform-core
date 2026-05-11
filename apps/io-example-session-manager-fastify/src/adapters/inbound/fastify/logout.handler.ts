import type { RouteRegistry } from "@pagopa/io-core-openapi";
import type { FastifyInstance } from "fastify";

import {
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-fastify";
import { defineRoute } from "@pagopa/io-core-openapi";

import type { LogoutUseCase } from "../../../application/use-cases/logout.use-case.js";

import {
  BearerAuthHeaderSchema,
  SuccessResponse,
} from "./dto/openapi-schemas.js";

const logoutContract = defineRoute({
  description: "Delete user's active session and tokens.",
  method: "post",
  operationId: "logout",
  path: "/api/auth/v1/logout",
  request: {
    headers: BearerAuthHeaderSchema,
  },
  response: {
    200: {
      description: "Logout succeeded.",
      schema: SuccessResponse,
    },
    400: ProblemJson,
    401: ProblemJson,
    500: ProblemJson,
  },
  security: [{ Bearer: [] }],
  summary: "Execute the logout",
  tags: ["Session"],
});

export const mountLogoutHandler = (
  server: FastifyInstance,
  useCase: LogoutUseCase,
  registry?: RouteRegistry,
): void => {
  mountFastifyRoute(server, {
    contract: logoutContract,
    registry,
    transformInput: ({ headers }) => ({
      authorization: headers.authorization,
    }),
    useCase,
  });
};
