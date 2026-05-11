import type { RouteRegistry } from "@pagopa/io-core-openapi";
import type { FastifyInstance } from "fastify";

import {
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-fastify";
import { defineRoute } from "@pagopa/io-core-openapi";

import type { FastLoginUseCase } from "../../../application/use-cases/fast-login.use-case.js";

import {
  FastLoginResponse,
  LollipopHeadersSchema,
} from "./dto/openapi-schemas.js";

const fastLoginContract = defineRoute({
  description:
    "POST a session refresh request with Lollipop. Requires a valid Lollipop signature.",
  method: "post",
  operationId: "fastLogin",
  path: "/api/auth/v1/fast-login",
  request: {
    headers: LollipopHeadersSchema,
  },
  response: {
    200: {
      description: "Session token issued successfully.",
      schema: FastLoginResponse,
    },
    400: ProblemJson,
    401: ProblemJson,
    403: ProblemJson,
    500: ProblemJson,
  },
  security: [],
  summary: "POST a session refresh request with Lollipop",
  tags: ["FastLogin"],
});

export const mountFastLoginHandler = (
  server: FastifyInstance,
  useCase: FastLoginUseCase,
  registry?: RouteRegistry,
): void => {
  mountFastifyRoute(server, {
    contract: fastLoginContract,
    registry,
    transformInput: ({ headers }) => ({ headers }),
    useCase,
  });
};
