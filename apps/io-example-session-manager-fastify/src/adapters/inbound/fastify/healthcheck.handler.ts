import type { RouteRegistry } from "@pagopa/io-core-openapi";
import type { FastifyInstance } from "fastify";

import {
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-fastify";
import { defineRoute } from "@pagopa/io-core-openapi";

import type { HealthcheckUseCase } from "../../../application/use-cases/healthcheck.use-case.js";

import { BackendVersion } from "./dto/openapi-schemas.js";

const healthcheckContract = defineRoute({
  description: "Responds with the app version if running.",
  method: "get",
  operationId: "healthcheck",
  path: "/api/auth/v1/healthcheck",
  request: {},
  response: {
    200: {
      description: "Service is healthy.",
      schema: BackendVersion,
    },
    500: ProblemJson,
  },
  security: [],
  summary: "The healthcheck endpoint",
  tags: ["Info"],
});

export const mountHealthcheckHandler = (
  server: FastifyInstance,
  useCase: HealthcheckUseCase,
  registry?: RouteRegistry,
): void => {
  mountFastifyRoute(server, {
    contract: healthcheckContract,
    registry,
    transformInput: () => ({}),
    useCase,
  });
};
