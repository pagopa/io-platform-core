import { sendErrorResponse } from "@pagopa/io-core-adapter-fastify";

import type { GetUserProfileUseCase } from "../../../application/use-cases/get-user-profile.use-case.js";
import type { TypedFastifyInstance } from "./schemas/shared.schemas.js";

export const mountGetUserProfileHandler = (
  fastifyServer: TypedFastifyInstance,
  useCase: GetUserProfileUseCase,
) => {
  fastifyServer.get(
    "/api/user-profiles",
    {
      schema: {
        description:
          "Returns the user profile associated with the given fiscal code.",
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
            description: "User profile returned successfully.",
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
