import type { RouteRegistry } from "@pagopa/io-core-openapi";
import type { FastifyInstance } from "fastify";

import {
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-fastify";
import { defineRoute } from "@pagopa/io-core-openapi";
import { z } from "zod";

import type { AcsUseCase } from "../../../application/use-cases/acs.use-case.js";

import { SAMLResponse } from "./dto/openapi-schemas.js";

/**
 * Placeholder 200 schema — the adapter framework requires a 2xx entry to wire
 * the use-case success path. The actual production response is the 301 below.
 */
const DummyAcsResponse = z
  .object({})
  .meta({ description: "Adapter placeholder (production responds with 301)." });

const acsContract = defineRoute({
  description:
    "ACS step of Login SPID/CIE. In production responds with a 301 redirect.",
  method: "post",
  operationId: "acs",
  path: "/api/auth/v1/assertionConsumerService",
  request: {
    body: SAMLResponse,
  },
  response: {
    200: {
      description: "Adapter placeholder (production responds with 301).",
      schema: DummyAcsResponse,
    },
    301: {
      description: "Redirect to home page",
      headers: {
        Location: { schema: { type: "string" } },
      },
      redirect: true,
    },
    500: ProblemJson,
  },
  security: [],
  summary: "ACS step of Login SPID/CIE",
  tags: ["Auth"],
});

export const mountAcsHandler = (
  server: FastifyInstance,
  useCase: AcsUseCase,
  registry?: RouteRegistry,
): void => {
  mountFastifyRoute(server, {
    contract: acsContract,
    registry,
    transformInput: ({ body }) => ({ samlResponse: body }),
    useCase,
  });
};
