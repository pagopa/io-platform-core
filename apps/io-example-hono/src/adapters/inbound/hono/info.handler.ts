import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";

import type { InfoUseCase } from "../../../application/use-cases/info.use-case.js";

import { InfoOutputSchema } from "./dto/openapi-schemas.js";
import { sendErrorResponse } from "./error-mapper.js";

const infoRoute = createRoute({
  description: "Returns the application name, version, and health status.",
  method: "get",
  operationId: "getInfo",
  path: "/api/info",
  responses: {
    200: {
      content: { "application/json": { schema: InfoOutputSchema } },
      description: "Application info returned successfully.",
    },
  },
  summary: "Health check / application info",
  tags: ["Info"],
});

export const mountInfoHandler = (
  app: OpenAPIHono,
  useCase: InfoUseCase,
): void => {
  app.openapi(infoRoute, async (c) => {
    const result = await useCase({});
    if (result.isErr()) return sendErrorResponse(c, result.error) as never;
    return c.json(result.value, 200);
  });
};
