import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import {
  type ErrorResponderConfig,
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/hexagonal-fastify";

import type { GetWidgetAuditUseCase } from "../../application/use-cases/get-widget-audit.use-case.js";

import { WidgetAuditSchema } from "../../domain/entities/widget-audit.entity.js";
import { WidgetIdPathSchema } from "../../domain/entities/widget-id.entity.js";
import { RequestIdHeaderSchema } from "./dto/request-id-header.dto.js";

/**
 * Route contract for retrieving widget audit events.
 *
 * The widget id path parameter and x-request-id header are validated before the
 * use case runs. Validation and generic use-case errors are documented as
 * problem+json responses.
 */
export const getWidgetAuditContract = defineRoute({
  description:
    "Returns audit events for a widget and correlates the request through x-request-id.",
  method: "get",
  operationId: "getWidgetAudit",
  path: "/api/v1/widgets/{id}/audit",
  request: { headers: RequestIdHeaderSchema, path: WidgetIdPathSchema },
  response: {
    200: WidgetAuditSchema,
    400: ProblemJson,
    500: ProblemJson,
  },
  summary: "Get widget audit events",
  tags: ["widgets"],
});

/**
 * Mounts the get widget audit HTTP handler on the provided Fastify server.
 *
 * @param server Fastify instance that receives the route.
 * @param useCase Application use case invoked with the validated id and request id.
 */
export const mountGetWidgetAuditHandler = (
  server: FastifyInstance,
  useCase: GetWidgetAuditUseCase,
  config?: ErrorResponderConfig,
): void => {
  mountFastifyRoute(
    server,
    {
      contract: getWidgetAuditContract,
      inputMapper: (req) => ({
        id: req.path.id,
        requestId: req.headers["x-request-id"],
      }),
      useCase,
    },
    config,
  );
};
