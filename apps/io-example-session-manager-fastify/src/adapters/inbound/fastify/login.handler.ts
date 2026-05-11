import type { RouteRegistry } from "@pagopa/io-core-openapi";
import type { FastifyInstance } from "fastify";

import {
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-fastify";
import { defineRoute } from "@pagopa/io-core-openapi";
import { z } from "zod";

import type { LoginUseCase } from "../../../application/use-cases/login.use-case.js";

import { LoginHeadersSchema, LoginQuerySchema } from "./dto/openapi-schemas.js";

/**
 * Dummy success schema — GET /login responds with a 302 redirect in
 * production. The "200" is a generator placeholder, as per the original
 * external.yaml. The post-processor adds the 302 response to the external
 * spec.
 */
const DummyLoginResponse = z.object({}).meta({
  description: "Dummy response for generator (see 302 in external spec).",
});

const loginContract = defineRoute({
  description:
    "Initiates the SPID/CIE login flow. In production responds with a 302 redirect to the identity provider.",
  method: "get",
  operationId: "login",
  path: "/api/auth/v1/login",
  request: {
    headers: LoginHeadersSchema,
    query: LoginQuerySchema,
  },
  response: {
    200: {
      description: "Dummy response for generator.",
      schema: DummyLoginResponse,
    },
    302: {
      description: "Redirect to IDP login page",
      headers: {
        Location: { schema: { type: "string" } },
      },
      redirect: true,
    },
    400: ProblemJson,
    500: ProblemJson,
  },
  security: [],
  summary: "Login SPID/CIE",
  tags: ["Auth"],
});

export const mountLoginHandler = (
  server: FastifyInstance,
  useCase: LoginUseCase,
  registry?: RouteRegistry,
): void => {
  mountFastifyRoute(server, {
    contract: loginContract,
    registry,
    transformInput: ({ headers, query }) => ({
      authLevel: query.authLevel,
      entityID: query.entityID,
      loginType: headers.loginType,
      "x-pagopa-current-user": headers["x-pagopa-current-user"],
      "x-pagopa-lollipop-pub-key": headers["x-pagopa-lollipop-pub-key"],
      "x-pagopa-lollipop-pub-key-hash-algo":
        headers["x-pagopa-lollipop-pub-key-hash-algo"],
    }),
    useCase,
  });
};
