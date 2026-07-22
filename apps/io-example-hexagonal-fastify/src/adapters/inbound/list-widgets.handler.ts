import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import {
  type ErrorResponderConfig,
  mountFastifyRoute,
  ProblemJson,
} from "@pagopa/hexagonal-fastify";

import type { ListWidgetsUseCase } from "../../application/use-cases/list-widgets.use-case.js";

import {
  ListWidgetsSchema,
  WidgetListSchema,
} from "../../domain/entities/widget-list.entity.js";

/**
 * Route contract for listing widgets through the public API.
 *
 * The query string is validated before invoking the use case, while generic
 * application failures are rendered as RFC 7807 problem+json responses.
 */
export const listWidgetsContract = defineRoute({
  description:
    "Returns a paginated list of widgets optionally filtered by a search term.",
  method: "get",
  operationId: "listWidgets",
  path: "/api/v1/widgets",
  request: { query: ListWidgetsSchema },
  response: {
    200: WidgetListSchema,
    400: ProblemJson,
    500: ProblemJson,
  },
  summary: "List widgets",
  tags: ["widgets"],
});

/**
 * Mounts the list widgets HTTP handler on the provided Fastify server.
 *
 * @param server Fastify instance that receives the route.
 * @param useCase Application use case invoked with validated list filters.
 */
export const mountListWidgetsHandler = (
  server: FastifyInstance,
  useCase: ListWidgetsUseCase,
  config?: ErrorResponderConfig,
): void => {
  mountFastifyRoute(
    server,
    {
      contract: listWidgetsContract,
      inputMapper: (req) => ({
        filter: req.query.filter,
        page: req.query.page,
        pageSize: req.query.pageSize,
      }),
      useCase,
    },
    config,
  );
};
