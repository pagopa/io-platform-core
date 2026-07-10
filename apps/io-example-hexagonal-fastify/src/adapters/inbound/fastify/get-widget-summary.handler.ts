import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import { mountFastifyRoute, ProblemJson } from "@pagopa/hexagonal-fastify";

import type { GetWidgetSummaryUseCase } from "../../../application/use-cases/get-widget-summary.use-case.js";

import {
  WidgetIdPathSchema,
  WidgetSummaryResponseSchema,
} from "./dto/schemas.js";

export const getWidgetSummaryContract = defineRoute({
  description:
    "Returns a summary of the widget. The use case returns an internal shape that the handler reshapes into the public response via an output mapper.",
  method: "get",
  operationId: "getWidgetSummary",
  path: "/api/v1/widgets/{id}/summary",
  request: { path: WidgetIdPathSchema },
  response: {
    200: WidgetSummaryResponseSchema,
    400: ProblemJson,
    500: ProblemJson,
  },
  summary: "Get a widget summary",
  tags: ["widgets"],
});

export const mountGetWidgetSummaryHandler = (
  server: FastifyInstance,
  useCase: GetWidgetSummaryUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: getWidgetSummaryContract,
    inputMapper: (req) => ({ id: req.path.id }),
    outputMapper: (output) => ({
      createdAt: new Date(output.createdAtEpochMs).toISOString(),
      description: output.details,
      id: output.widgetId,
      name: output.label,
    }),
    useCase,
  });
};
