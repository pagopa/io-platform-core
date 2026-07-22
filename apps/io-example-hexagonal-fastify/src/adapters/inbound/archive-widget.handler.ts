import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import {
  type ErrorResponderConfig,
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/hexagonal-fastify";
import { z } from "zod";

import type { ArchiveWidgetUseCase } from "../../application/use-cases/archive-widget.use-case.js";

import { WidgetIdPathSchema } from "../../domain/entities/widget-id.entity.js";

export const archiveWidgetContract = defineRoute({
  description:
    "Archives the widget and returns 204 No Content. The use case still returns a value, but the contract strips the body.",
  method: "post",
  operationId: "archiveWidget",
  path: "/api/v1/widgets/{id}/archive",
  request: { path: WidgetIdPathSchema },
  response: { 204: z.object({}), 400: ProblemJson, 500: ProblemJson },
  summary: "Archive a widget",
  tags: ["widgets"],
});

export const mountArchiveWidgetHandler = (
  server: FastifyInstance,
  useCase: ArchiveWidgetUseCase,
  config?: ErrorResponderConfig,
): void => {
  mountFastifyRoute(
    server,
    {
      contract: archiveWidgetContract,
      inputMapper: (req) => ({ id: req.path.id }),
      // The 204 contract strips the body, so the use case's result is discarded
      // by mapping it to an empty object.
      outputMapper: () => ({}),
      useCase,
    },
    config,
  );
};
