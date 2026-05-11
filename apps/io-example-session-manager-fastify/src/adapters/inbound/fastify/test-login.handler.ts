import type { RouteRegistry } from "@pagopa/io-core-openapi";
import type { FastifyInstance } from "fastify";

import {
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-fastify";
import { defineRoute } from "@pagopa/io-core-openapi";

import type { TestLoginUseCase } from "../../../application/use-cases/test-login.use-case.js";

import {
  AccessToken,
  PasswordLogin,
  TestLoginHeadersSchema,
} from "./dto/openapi-schemas.js";

const testLoginContract = defineRoute({
  description: "Login test user with password and Fiscal Code.",
  method: "post",
  operationId: "testLogin",
  path: "/api/auth/v1/test-login",
  request: {
    body: PasswordLogin,
    headers: TestLoginHeadersSchema,
  },
  response: {
    200: {
      description: "Access token issued successfully.",
      schema: AccessToken,
    },
    401: ProblemJson,
    500: ProblemJson,
  },
  security: [],
  summary: "Login Test User with password",
  tags: ["Auth"],
});

export const mountTestLoginHandler = (
  server: FastifyInstance,
  useCase: TestLoginUseCase,
  registry?: RouteRegistry,
): void => {
  mountFastifyRoute(server, {
    contract: testLoginContract,
    registry,
    transformInput: ({ body }) => ({
      password: body.password,
      username: body.username,
    }),
    useCase,
  });
};
