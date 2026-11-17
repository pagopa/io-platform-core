import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import {
  type ErrorResponderConfig,
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/hexagonal-fastify";
import { z } from "zod";

import type { RefreshWidgetUseCase } from "../../application/use-cases/refresh-widget.use-case.js";

import { WidgetIdPathSchema } from "../../domain/entities/widget-id.entity.js";
import { WidgetTaskIdSchema } from "../../domain/value-objects/widget-task-id.value-object.js";
import { WidgetRefreshAcceptedSchema } from "./dto/widget-refresh-accepted.dto.js";

export const refreshWidgetContract = defineRoute({
  description:
    "Enqueues an asynchronous refresh of the widget and returns 202 Accepted. The handler reshapes the internal job id into the public task id via an output mapper.",
  method: "post",
  operationId: "refreshWidget",
  path: "/api/v1/widgets/{id}/refresh",
  request: { path: WidgetIdPathSchema },
  response: {
    202: {
      headers: z.object({ "x-widget-task-id": WidgetTaskIdSchema }),
      schema: WidgetRefreshAcceptedSchema,
    },
    400: ProblemJson,
    500: ProblemJson,
  },
  summary: "Refresh a widget",
  tags: ["widgets"],
});

export const mountRefreshWidgetHandler = (
  server: FastifyInstance,
  useCase: RefreshWidgetUseCase,
  config?: ErrorResponderConfig,
): void => {
  mountFastifyRoute(
    server,
    {
      contract: refreshWidgetContract,
      inputMapper: (req) => ({ id: req.path.id }),
      outputMapper: (output) => ({
        body: {
          status: "accepted" as const,
          taskId: output.jobId,
        },
        headers: { "x-widget-task-id": output.jobId },
        status: 202,
      }),
      useCase,
    },
    config,
  );
};
