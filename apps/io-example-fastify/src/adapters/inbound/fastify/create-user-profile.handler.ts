import { sendErrorResponse } from "@pagopa/io-core-adapter-fastify";

import type { CreateUserProfileUseCase } from "../../../application/use-cases/create-user-profile.use-case.js";
import type { TypedFastifyInstance } from "./schemas/shared.schemas.js";

export const mountCreateUserProfileHandler = (
  fastifyServer: TypedFastifyInstance,
  useCase: CreateUserProfileUseCase,
) => {
  fastifyServer.post(
    "/api/user-profiles",
    {
      schema: {
        body: { $ref: "CreateUserProfileRequest#" },
        description: "Creates a new user profile with the provided data.",
        response: {
          201: {
            $ref: "UserProfile#",
            description: "User profile created successfully.",
          },
          400: { $ref: "ProblemDetails#" },
          409: { $ref: "ProblemDetails#" },
          422: { $ref: "ProblemDetails#" },
          500: { $ref: "ProblemDetails#" },
        },
        tags: ["UserProfiles"],
      },
    },
    async (request, reply) => {
      const result = await useCase({
        birthDate: new Date(request.body.birthDate),
        email: request.body.email,
        fiscalCode: request.body.fiscalCode,
        name: request.body.name,
      });

      if (result.isErr()) {
        return sendErrorResponse(reply, result.error);
      }

      return reply.code(201).send({ ...result.value });
    },
  );
};
