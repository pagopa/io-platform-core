import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import { mountFastifyRoute, ProblemJson } from "@pagopa/hexagonal-fastify";

import type { GetWidgetSummaryUseCase } from "../../application/use-cases/get-widget-summary.use-case.js";

import { WidgetIdPathSchema } from "../../domain/entities/widget-id.entity.js";
import { AuthorizationHeadersSchema } from "./dto/middleware-headers.dto.js";
import { WidgetSummarySchema } from "./dto/widget-summary.dto.js";
import { authenticateRequest } from "./middleware/request.middleware.js";

/** Contract for a widget summary that requires request authentication. */
export const getAuthenticatedWidgetSummaryContract = defineRoute({
  description:
    "Returns a widget summary after the authentication middleware accepts the request.",
  method: "get",
  operationId: "getAuthenticatedWidgetSummary",
  path: "/api/v1/widgets/{id}/authenticated-summary",
  request: {
    headers: AuthorizationHeadersSchema,
    path: WidgetIdPathSchema,
  },
  response: {
    200: WidgetSummarySchema,
    400: ProblemJson,
    401: ProblemJson,
    500: ProblemJson,
  },
  summary: "Get an authenticated widget summary",
  tags: ["widgets", "middleware"],
});

/** Mounts the single-middleware summary example on the Fastify server. */
export const mountAuthenticatedWidgetSummaryHandler = (
  server: FastifyInstance,
  useCase: GetWidgetSummaryUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: getAuthenticatedWidgetSummaryContract,
    inputMapper: (req) => ({ id: req.path.id }),
    middlewares: [authenticateRequest],
    outputMapper: (output) => ({
      createdAt: new Date(output.createdAtEpochMs).toISOString(),
      description: output.details,
      id: output.widgetId,
      name: output.label,
    }),
    useCase,
  });
};
