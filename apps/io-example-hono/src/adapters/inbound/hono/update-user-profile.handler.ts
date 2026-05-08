import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";

import type { UpdateUserProfileUseCase } from "../../../application/use-cases/update-user-profile.use-case.js";

import {
  FiscalCodeHeaderSchema,
  ProblemDetailsSchema,
  UpdateUserProfileBodySchema,
  UserProfileResponseSchema,
} from "./dto/openapi-schemas.js";
import { sendErrorResponse } from "./error-mapper.js";

const toResponseBody = (
  value: Parameters<typeof UserProfileResponseSchema.parse>[0],
) => UserProfileResponseSchema.parse(value);

const updateUserProfileRoute = createRoute({
  description: "Updates the user profile identified by the fiscal code header.",
  method: "put",
  operationId: "updateUserProfile",
  path: "/api/user-profiles",
  request: {
    body: {
      content: { "application/json": { schema: UpdateUserProfileBodySchema } },
      required: true,
    },
    headers: FiscalCodeHeaderSchema,
  },
  responses: {
    200: {
      content: { "application/json": { schema: UserProfileResponseSchema } },
      description: "User profile updated successfully.",
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
  summary: "Update an existing user profile",
  tags: ["UserProfiles"],
});

export const mountUpdateUserProfileHandler = (
  app: OpenAPIHono,
  useCase: UpdateUserProfileUseCase,
): void => {
  app.openapi(updateUserProfileRoute, async (c) => {
    const body = c.req.valid("json");
    const { "x-fiscal-code": fiscalCode } = c.req.valid("header");
    const result = await useCase({
      email: body.email,
      fiscalCode,
      name: body.name,
    });
    if (result.isErr()) return sendErrorResponse(c, result.error) as never;
    return c.json(toResponseBody(result.value), 200);
  });
};
