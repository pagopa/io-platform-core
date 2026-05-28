import type { UseCase } from "@pagopa/io-core-domain";
import type { BaseError } from "@pagopa/io-core-domain/errors";

import { sendErrorResponse } from "@pagopa/io-core-adapter-fastify";
import type { FromSchema } from "json-schema-to-ts";

import type { TypedFastifyInstance } from "./schemas/shared.schemas.js";
import { InfoOutputSchema } from "./schemas/shared.schemas.js";

type InfoOutput = FromSchema<typeof InfoOutputSchema>;

export const mountInfoHandler = (
  fastifyServer: TypedFastifyInstance,
  useCase: UseCase<Record<string, never>, InfoOutput, BaseError>,
) => {
  fastifyServer.get(
    "/api/info",
    {
      schema: {
        description:
          "Returns the application name, version, and health status.",
        response: {
          200: {
            $ref: "InfoOutput#",
            description: "Application info returned successfully.",
          },
          500: { $ref: "ProblemDetails#" },
        },
        tags: ["Info"],
      },
    },
    async (request, reply) => {
      const result = await useCase({} as Record<string, never>);

      if (result.isErr()) {
        return sendErrorResponse(reply, result.error);
      }

      return reply.send(result.value);
    },
  );
};
