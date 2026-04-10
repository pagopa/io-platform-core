import type { UseCase } from "@pagopa/io-core-domain";
import type { BaseError } from "@pagopa/io-core-domain/errors";

import {
  createHttpHandler,
  emptyValidator,
} from "@pagopa/io-core-adapter-fastify";
import { FastifyInstance } from "fastify";

export const mountInfoHandler = <O>(
  fastifyServer: FastifyInstance,
  useCase: UseCase<Record<string, never>, O, BaseError>,
) => {
  fastifyServer.get("/api/info", createHttpHandler(useCase, emptyValidator));
};
