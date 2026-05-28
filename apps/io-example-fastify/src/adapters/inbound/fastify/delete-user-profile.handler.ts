import { sendErrorResponse } from "@pagopa/io-core-adapter-fastify";

import type { DeleteUserProfileUseCase } from "../../../application/use-cases/delete-user-profile.use-case.js";
import type { TypedFastifyInstance } from "./schemas/shared.schemas.js";

export const mountDeleteUserProfileHandler = (
  fastifyServer: TypedFastifyInstance,
  useCase: DeleteUserProfileUseCase,
) => {
  fastifyServer.delete(
    "/api/user-profiles",
    {
      schema: {
        description:
          "Deletes the user profile associated with the given fiscal code and returns the deleted profile.",
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
            description: "User profile deleted successfully.",
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
        fiscalCode: request.headers["x-fiscal-code"],
      });

      if (result.isErr()) {
        return sendErrorResponse(reply, result.error);
      }

      return reply.send(result.value);
    },
  );
};
