import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";

import type { GetUserProfileUseCase } from "../../../application/use-cases/get-user-profile.use-case.js";

import {
  FiscalCodeHeaderSchema,
  ProblemDetailsSchema,
  UserProfileResponseSchema,
} from "./dto/openapi-schemas.js";
import { sendErrorResponse } from "./error-mapper.js";

const toResponseBody = (
  value: Parameters<typeof UserProfileResponseSchema.parse>[0],
) => UserProfileResponseSchema.parse(value);

const getUserProfileRoute = createRoute({
  description:
    "Returns the user profile associated with the given fiscal code.",
  method: "get",
  operationId: "getUserProfile",
  path: "/api/user-profiles",
  request: {
    headers: FiscalCodeHeaderSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: UserProfileResponseSchema } },
      description: "User profile returned successfully.",
    },
    400: {
      content: { "application/problem+json": { schema: ProblemDetailsSchema } },
      description: "Validation error.",
    },
    404: {
      content: { "application/problem+json": { schema: ProblemDetailsSchema } },
      description: "User profile not found.",
    },
    500: {
      content: { "application/problem+json": { schema: ProblemDetailsSchema } },
      description: "Internal server error.",
    },
  },
  security: [{ functionKey: [] }],
  summary: "Get a user profile by fiscal code",
  tags: ["UserProfiles"],
});

export const mountGetUserProfileHandler = (
  app: OpenAPIHono,
  useCase: GetUserProfileUseCase,
): void => {
  app.openapi(getUserProfileRoute, async (c) => {
    const { "x-fiscal-code": fiscalCode } = c.req.valid("header");
    const result = await useCase({ fiscalCode });
    if (result.isErr()) return sendErrorResponse(c, result.error) as never;
    return c.json(toResponseBody(result.value), 200);
  });
};
