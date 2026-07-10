import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import { mountFastifyRoute, ProblemJson } from "@pagopa/hexagonal-fastify";

import type { RefreshWidgetUseCase } from "../../application/use-cases/refresh-widget.use-case.js";

import { WidgetIdSchema } from "../../domain/entities/widget-id.entity.js";
import { WidgetRefreshAcceptedSchema } from "./dto/widget-refresh-accepted.dto.js";

export const refreshWidgetContract = defineRoute({
  description:
    "Enqueues an asynchronous refresh of the widget and returns 202 Accepted. The handler reshapes the internal job id into the public task id via an output mapper.",
  method: "post",
  operationId: "refreshWidget",
  path: "/api/v1/widgets/{id}/refresh",
  request: { path: WidgetIdSchema },
  response: {
    202: WidgetRefreshAcceptedSchema,
    400: ProblemJson,
    500: ProblemJson,
  },
  summary: "Refresh a widget",
  tags: ["widgets"],
});

export const mountRefreshWidgetHandler = (
  server: FastifyInstance,
  useCase: RefreshWidgetUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: refreshWidgetContract,
    inputMapper: (req) => ({ id: req.path.id }),
    outputMapper: (output) => ({
      status: "accepted" as const,
      taskId: output.jobId,
    }),
    useCase,
  });
};
