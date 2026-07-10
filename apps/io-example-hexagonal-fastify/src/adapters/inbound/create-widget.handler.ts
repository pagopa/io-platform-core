import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import { mountFastifyRoute, ProblemJson } from "@pagopa/hexagonal-fastify";

import type { CreateWidgetUseCase } from "../../application/use-cases/create-widget.use-case.js";

import { CreateWidgetSchema } from "../../domain/entities/widget-mutation.entity.js";
import { WidgetSchema } from "../../domain/entities/widget.entity.js";

/**
 * Route contract for creating a widget.
 *
 * The request body is validated by the adapter and successful creations are
 * returned with HTTP 201. Validation and generic failures are documented as
 * problem+json responses.
 */
export const createWidgetContract = defineRoute({
  description: "Creates a widget from the supplied name and description.",
  method: "post",
  operationId: "createWidget",
  path: "/api/v1/widgets",
  request: { body: CreateWidgetSchema },
  response: { 201: WidgetSchema, 400: ProblemJson, 500: ProblemJson },
  summary: "Create a widget",
  tags: ["widgets"],
});

/**
 * Mounts the create widget HTTP handler on the provided Fastify server.
 *
 * @param server Fastify instance that receives the route.
 * @param useCase Application use case invoked with the validated body payload.
 */
export const mountCreateWidgetHandler = (
  server: FastifyInstance,
  useCase: CreateWidgetUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: createWidgetContract,
    inputMapper: (req) => ({
      description: req.body.description,
      name: req.body.name,
    }),
    useCase,
  });
};
