import type { RouteRegistry } from "@pagopa/io-core-openapi";
import type { FastifyInstance } from "fastify";

import {
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-fastify";
import { defineRoute } from "@pagopa/io-core-openapi";

import type { GenerateNonceUseCase } from "../../../application/use-cases/generate-nonce.use-case.js";

import { GenerateNonceResponse } from "./dto/openapi-schemas.js";

const generateNonceContract = defineRoute({
  description: "Generate a Nonce for a session refresh flow.",
  method: "post",
  operationId: "lvGenerateNonce",
  path: "/api/auth/v1/fast-login/nonce/generate",
  request: {},
  response: {
    200: {
      description: "Nonce generated successfully.",
      schema: GenerateNonceResponse,
    },
    500: ProblemJson,
  },
  security: [],
  summary: "Generate a Nonce for a session refresh flow",
  tags: ["FastLogin"],
});

export const mountGenerateNonceHandler = (
  server: FastifyInstance,
  useCase: GenerateNonceUseCase,
  registry?: RouteRegistry,
): void => {
  mountFastifyRoute(server, {
    contract: generateNonceContract,
    registry,
    transformInput: () => ({}),
    useCase,
  });
};
