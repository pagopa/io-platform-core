import { sendErrorResponse } from "@pagopa/io-core-adapter-fastify";

import type { UpdateUserProfileUseCase } from "../../../application/use-cases/update-user-profile.use-case.js";
import type { TypedFastifyInstance } from "./schemas/shared.schemas.js";

export const mountUpdateUserProfileHandler = (
  fastifyServer: TypedFastifyInstance,
  useCase: UpdateUserProfileUseCase,
) => {
  fastifyServer.put(
    "/api/user-profiles",
    {
      schema: {
        body: { $ref: "UpdateUserProfileRequest#" },
        description:
          "Updates the user profile identified by the fiscal code header.",
        headers: {
          properties: {
            "x-fiscal-code": { $ref: "FiscalCode#" },
          },
          required: ["x-fiscal-code"],
          type: "object",
        },
        response: {
          200: {
            $ref: "UserProfile#",
            description: "User profile updated successfully.",
          },
          400: { $ref: "ProblemDetails#" },
          404: { $ref: "ProblemDetails#" },
          500: { $ref: "ProblemDetails#" },
        },
        tags: ["UserProfiles"],
      },
    },
    async (request, reply) => {
      const result = await useCase({
        email: request.body.email,
        fiscalCode: request.headers["x-fiscal-code"],
        name: request.body.name,
      });

      if (result.isErr()) {
        return sendErrorResponse(reply, result.error);
      }

      return reply.send(result.value);
    },
  );
};
