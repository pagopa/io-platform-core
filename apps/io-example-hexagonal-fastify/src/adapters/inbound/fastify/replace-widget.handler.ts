import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import { mountFastifyRoute, ProblemJson } from "@pagopa/hexagonal-fastify";

import type { ReplaceWidgetUseCase } from "../../../application/use-cases/replace-widget.use-case.js";

import {
  ReplaceWidgetBodySchema,
  WidgetIdPathSchema,
  WidgetResponseSchema,
} from "./dto/schemas.js";

/**
 * Route contract for replacing a widget by id.
 *
 * Both path parameters and the replacement body are validated before the use
 * case runs. Adapter validation and generic use-case errors are documented as
 * problem+json responses.
 */
const replaceWidgetContract = defineRoute({
  description:
    "Replaces the widget identified by id with the supplied payload.",
  method: "put",
  operationId: "replaceWidget",
  path: "/api/v1/widgets/{id}",
  request: { body: ReplaceWidgetBodySchema, path: WidgetIdPathSchema },
  response: { 200: WidgetResponseSchema, 400: ProblemJson, 500: ProblemJson },
  summary: "Replace a widget",
  tags: ["widgets"],
});

/**
 * Mounts the replace widget HTTP handler on the provided Fastify server.
 *
 * @param server Fastify instance that receives the route.
 * @param useCase Application use case invoked with the validated id and body.
 */
export const mountReplaceWidgetHandler = (
  server: FastifyInstance,
  useCase: ReplaceWidgetUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: replaceWidgetContract,
    inputMapper: (req) => ({
      description: req.body.description,
      id: req.path.id,
      name: req.body.name,
    }),
    useCase,
  });
};
