import type { UseCase } from "@pagopa/io-core-domain";
import type { BaseError } from "@pagopa/io-core-domain/errors";

import { app } from "@azure/functions";
import {
  emptyValidator,
  GetHttpHandler,
} from "@pagopa/io-core-azure-functions-v4-adapter";

export const mountInfoHandler = <O>(
  useCase: UseCase<Record<string, never>, O, BaseError>,
) => {
  app.http("Info", {
    authLevel: "anonymous",
    handler: GetHttpHandler(useCase, emptyValidator),
    methods: ["GET"],
    route: "info",
  });
};
