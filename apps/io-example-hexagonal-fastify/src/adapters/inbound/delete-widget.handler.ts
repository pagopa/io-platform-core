import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import {
  type ErrorResponderConfig,
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/hexagonal-fastify";
import { z } from "zod";

import type { DeleteWidgetUseCase } from "../../application/use-cases/delete-widget.use-case.js";

import { WidgetIdPathSchema } from "../../domain/entities/widget-id.entity.js";

/**
 * Route contract for deleting a widget by id.
 *
 * A successful deletion returns HTTP 204 with no response body, while generic
 * application failures are returned as problem+json responses.
 */
export const deleteWidgetContract = defineRoute({
  description: "Deletes the widget identified by the supplied path parameter.",
  method: "delete",
  operationId: "deleteWidget",
  path: "/api/v1/widgets/{id}",
  request: { path: WidgetIdPathSchema },
  response: { 204: z.object({}), 400: ProblemJson, 500: ProblemJson },
  summary: "Delete a widget",
  tags: ["widgets"],
});

/**
 * Mounts the delete widget HTTP handler on the provided Fastify server.
 *
 * @param server Fastify instance that receives the route.
 * @param useCase Application use case invoked with the validated widget id.
 */
export const mountDeleteWidgetHandler = (
  server: FastifyInstance,
  useCase: DeleteWidgetUseCase,
  config?: ErrorResponderConfig,
): void => {
  mountFastifyRoute(
    server,
    {
      contract: deleteWidgetContract,
      inputMapper: (req) => ({ id: req.path.id }),
      useCase,
    },
    config,
  );
};
