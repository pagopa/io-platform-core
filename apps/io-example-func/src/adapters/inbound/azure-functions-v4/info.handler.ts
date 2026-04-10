import type { UseCase } from "@pagopa/io-core-domain";
import type { BaseError } from "@pagopa/io-core-domain/errors";

import { app } from "@azure/functions";
import {
  createHttpHandler,
  emptyValidator,
} from "@pagopa/io-core-adapter-azure-functions-v4";

export const mountInfoHandler = <O>(
  useCase: UseCase<Record<string, never>, O, BaseError>,
) => {
  app.http("Info", {
    authLevel: "anonymous",
    handler: createHttpHandler(useCase, emptyValidator),
    methods: ["GET"],
    route: "info",
  });
};
