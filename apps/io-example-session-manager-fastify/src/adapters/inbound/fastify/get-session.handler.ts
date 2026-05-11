import type { RouteRegistry } from "@pagopa/io-core-openapi";
import type { FastifyInstance } from "fastify";

import {
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-fastify";
import { defineRoute } from "@pagopa/io-core-openapi";

import type { GetSessionUseCase } from "../../../application/use-cases/get-session.use-case.js";

import {
  BearerAuthHeaderSchema,
  PublicSession,
  SessionQuerySchema,
} from "./dto/openapi-schemas.js";

const getSessionContract = defineRoute({
  description: "Return the session state for the current authenticated user.",
  method: "get",
  operationId: "getSessionState",
  path: "/api/auth/v1/session",
  request: {
    headers: BearerAuthHeaderSchema,
    query: SessionQuerySchema,
  },
  response: {
    200: {
      description: "Session state returned successfully.",
      schema: PublicSession,
    },
    400: ProblemJson,
    401: ProblemJson,
    500: ProblemJson,
  },
  security: [{ Bearer: [] }],
  summary: "Get the user current session",
  tags: ["Session"],
});

export const mountGetSessionHandler = (
  server: FastifyInstance,
  useCase: GetSessionUseCase,
  registry?: RouteRegistry,
): void => {
  mountFastifyRoute(server, {
    contract: getSessionContract,
    registry,
    transformInput: ({ headers, query }) => ({
      authorization: headers.authorization,
      fields: query.fields,
    }),
    useCase,
  });
};
