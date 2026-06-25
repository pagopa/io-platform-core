import type { FastifyInstance } from "fastify";

import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import { mountFastifyRoute, ProblemJson } from "@pagopa/hexagonal-fastify";

import type { ListWidgetsUseCase } from "../../../application/use-cases/list-widgets.use-case.js";

import {
  ListWidgetsQuerySchema,
  WidgetListResponseSchema,
} from "./dto/schemas.js";

/**
 * Route contract for listing widgets through the public API.
 *
 * The query string is validated before invoking the use case, while generic
 * application failures are rendered as RFC 7807 problem+json responses.
 */
const listWidgetsContract = defineRoute({
  description:
    "Returns a paginated list of widgets optionally filtered by a search term.",
  method: "get",
  operationId: "listWidgets",
  path: "/api/v1/widgets",
  request: { query: ListWidgetsQuerySchema },
  response: { 200: WidgetListResponseSchema, 500: ProblemJson },
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
): void => {
  mountFastifyRoute(server, {
    contract: listWidgetsContract,
    inputMapper: (req) => ({
      filter: req.query.filter,
      page: req.query.page,
      pageSize: req.query.pageSize,
    }),
    useCase,
  });
};
