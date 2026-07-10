import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import { mountFastifyRoute, ProblemJson } from "@pagopa/hexagonal-fastify";

import type { GetWidgetUseCase } from "../../application/use-cases/get-widget.use-case.js";

import { WidgetIdSchema } from "../../domain/entities/widget-id.entity.js";
import { WidgetSchema } from "../../domain/entities/widget.entity.js";

/**
 * Route contract for retrieving a widget by id.
 *
 * The path parameter is validated as a widget id before the use case is called,
 * and generic application failures are returned as problem+json responses.
 */
export const getWidgetContract = defineRoute({
  description: "Returns the widget identified by the supplied path parameter.",
  method: "get",
  operationId: "getWidget",
  path: "/api/v1/widgets/{id}",
  request: { path: WidgetIdSchema },
  response: { 200: WidgetSchema, 400: ProblemJson, 500: ProblemJson },
  summary: "Get a widget",
  tags: ["widgets"],
});

/**
 * Mounts the get widget HTTP handler on the provided Fastify server.
 *
 * @param server Fastify instance that receives the route.
 * @param useCase Application use case invoked with the validated widget id.
 */
export const mountGetWidgetHandler = (
  server: FastifyInstance,
  useCase: GetWidgetUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: getWidgetContract,
    inputMapper: (req) => ({ id: req.path.id }),
    useCase,
  });
};
