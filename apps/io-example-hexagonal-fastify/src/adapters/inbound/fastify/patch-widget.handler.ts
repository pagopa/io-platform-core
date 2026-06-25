import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import { mountFastifyRoute, ProblemJson } from "@pagopa/hexagonal-fastify";

import type { PatchWidgetUseCase } from "../../../application/use-cases/patch-widget.use-case.js";

import {
  PatchWidgetBodySchema,
  WidgetIdPathSchema,
  WidgetResponseSchema,
} from "./dto/schemas.js";

/**
 * Route contract for partially updating a widget by id.
 *
 * The adapter validates the widget id and partial body before the application
 * use case is invoked, documenting validation and generic errors as problem+json.
 */
const patchWidgetContract = defineRoute({
  description:
    "Applies a partial update to the widget identified by the supplied id.",
  method: "patch",
  operationId: "patchWidget",
  path: "/api/v1/widgets/{id}",
  request: { body: PatchWidgetBodySchema, path: WidgetIdPathSchema },
  response: { 200: WidgetResponseSchema, 400: ProblemJson, 500: ProblemJson },
  summary: "Patch a widget",
  tags: ["widgets"],
});

/**
 * Mounts the patch widget HTTP handler on the provided Fastify server.
 *
 * @param server Fastify instance that receives the route.
 * @param useCase Application use case invoked with the validated id and patch.
 */
export const mountPatchWidgetHandler = (
  server: FastifyInstance,
  useCase: PatchWidgetUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: patchWidgetContract,
    inputMapper: (req) => ({
      description: req.body.description,
      id: req.path.id,
      name: req.body.name,
    }),
    useCase,
  });
};
