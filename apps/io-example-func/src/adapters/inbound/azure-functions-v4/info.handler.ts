import type { RouteRegistry } from "@pagopa/io-core-openapi";

import { mountFunctionsRoute } from "@pagopa/io-core-adapter-azure-functions-v4";
import { defineRoute } from "@pagopa/io-core-openapi";

import type { InfoUseCase } from "../../../application/use-cases/info.use-case.js";

import { InfoOutputSchema } from "./dto/openapi-schemas.js";

const infoContract = defineRoute({
  description: "Returns the application name, version, and health status.",
  method: "get",
  operationId: "getInfo",
  path: "/api/info",
  request: {},
  response: {
    200: {
      description: "Application info returned successfully.",
      schema: InfoOutputSchema,
    },
  },
  summary: "Health check / application info",
  tags: ["Info"],
});

export const mountInfoHandler = (
  useCase: InfoUseCase,
  registry?: RouteRegistry,
): void => {
  mountFunctionsRoute({
    authLevel: "anonymous",
    contract: infoContract,
    registry,
    transformInput: () => ({}),
    useCase,
  });
};
