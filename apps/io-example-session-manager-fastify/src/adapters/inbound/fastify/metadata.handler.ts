import type { RouteRegistry } from "@pagopa/io-core-openapi";
import type { FastifyInstance } from "fastify";

import { mountFastifyRoute } from "@pagopa/io-core-adapter-fastify";
import { defineRoute } from "@pagopa/io-core-openapi";
import { z } from "zod";

import type { MetadataUseCase } from "../../../application/use-cases/metadata.use-case.js";

/**
 * GET /metadata returns SPID XML metadata (application/xml).
 * Zod models it as a plain string; the external spec post-processor corrects
 * the content-type annotation to application/xml.
 * No error responses are declared in the original spec.
 */
const MetadataResponse = z.string().meta({
  description: "SPID SP metadata (XML document).",
  type: "string",
});

const metadataContract = defineRoute({
  description: "Returns the SPID Service Provider metadata.",
  method: "get",
  operationId: "getMetadata",
  path: "/api/auth/v1/metadata",
  request: {},
  response: {
    200: {
      description: "SPID metadata returned successfully.",
      schema: MetadataResponse,
    },
  },
  security: [],
  summary: "Get SPID metadata",
  tags: ["Auth"],
});

export const mountMetadataHandler = (
  server: FastifyInstance,
  useCase: MetadataUseCase,
  registry?: RouteRegistry,
): void => {
  mountFastifyRoute(server, {
    contract: metadataContract,
    registry,
    transformInput: () => ({}),
    useCase,
  });
};
