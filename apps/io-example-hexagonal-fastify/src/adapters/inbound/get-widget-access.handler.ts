import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import { mountFastifyRoute, ProblemJson } from "@pagopa/hexagonal-fastify";

import type { GetWidgetAccessUseCase } from "../../application/use-cases/get-widget-access.use-case.js";

import { WidgetAccessSchema } from "../../domain/entities/widget-access.entity.js";
import { WidgetIdPathSchema } from "../../domain/entities/widget-id.entity.js";
import { RequestContextHeadersSchema } from "./dto/middleware-headers.dto.js";
import {
  authenticateRequest,
  extractClientIp,
  resolveCallerAttributes,
} from "./middleware/request.middleware.js";

const widgetAccessMiddlewares = [
  authenticateRequest,
  extractClientIp,
  resolveCallerAttributes,
] as const;

/** Contract for the route that exposes the complete middleware context. */
export const getWidgetAccessContract = defineRoute({
  description:
    "Returns the caller and client IP resolved by a composed middleware chain.",
  method: "get",
  operationId: "getWidgetAccess",
  path: "/api/v1/widgets/{id}/access",
  request: {
    headers: RequestContextHeadersSchema,
    path: WidgetIdPathSchema,
  },
  response: {
    200: WidgetAccessSchema,
    400: ProblemJson,
    401: ProblemJson,
  },
  summary: "Get widget access context",
  tags: ["widgets", "middleware"],
});

/** Mounts the composed middleware context example on the Fastify server. */
export const mountGetWidgetAccessHandler = (
  server: FastifyInstance,
  useCase: GetWidgetAccessUseCase,
): void => {
  mountFastifyRoute(server, {
    contract: getWidgetAccessContract,
    inputMapper: (req, context) => ({
      caller: context.caller,
      clientIp: context.clientIp,
      widgetId: req.path.id,
    }),
    middlewares: widgetAccessMiddlewares,
    useCase,
  });
};
