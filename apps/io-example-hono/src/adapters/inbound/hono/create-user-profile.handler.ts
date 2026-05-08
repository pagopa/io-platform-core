import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";

import type { CreateUserProfileUseCase } from "../../../application/use-cases/create-user-profile.use-case.js";

import {
  CreateUserProfileBodySchema,
  ProblemDetailsSchema,
  UserProfileResponseSchema,
} from "./dto/openapi-schemas.js";
import { sendErrorResponse } from "./error-mapper.js";

const toResponseBody = (
  value: Parameters<typeof UserProfileResponseSchema.parse>[0],
) => UserProfileResponseSchema.parse(value);

const createUserProfileRoute = createRoute({
  description: "Creates a new user profile with the provided data.",
  method: "post",
  operationId: "createUserProfile",
  path: "/api/user-profiles",
  request: {
    body: {
      content: { "application/json": { schema: CreateUserProfileBodySchema } },
      required: true,
    },
  },
  responses: {
    201: {
      content: { "application/json": { schema: UserProfileResponseSchema } },
      description: "User profile created successfully.",
    },
    400: {
      content: { "application/problem+json": { schema: ProblemDetailsSchema } },
      description: "Validation error.",
    },
    409: {
      content: { "application/problem+json": { schema: ProblemDetailsSchema } },
      description: "User profile already exists.",
    },
    422: {
      content: { "application/problem+json": { schema: ProblemDetailsSchema } },
      description: "User must be at least 18 years old.",
    },
    500: {
      content: { "application/problem+json": { schema: ProblemDetailsSchema } },
      description: "Internal server error.",
    },
  },
  security: [{ functionKey: [] }],
  summary: "Create a new user profile",
  tags: ["UserProfiles"],
});

export const mountCreateUserProfileHandler = (
  app: OpenAPIHono,
  useCase: CreateUserProfileUseCase,
): void => {
  app.openapi(createUserProfileRoute, async (c) => {
    const body = c.req.valid("json");
    const result = await useCase(body);
    if (result.isErr()) return sendErrorResponse(c, result.error) as never;
    return c.json(toResponseBody(result.value), 201);
  });
};
