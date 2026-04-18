import type { UseCase } from "@pagopa/io-core-domain";
import type { BaseError } from "@pagopa/io-core-domain/errors";

import { app } from "@azure/functions";
import { mountEndpoint } from "@pagopa/io-core-adapter-azure-functions-v4";
import z from "zod";

export const mountInfoHandler = <O>(
  useCase: UseCase<Record<string, never>, O, BaseError>,
) => {
  mountEndpoint(app, {
    authLevel: "anonymous",
    method: "GET",
    name: "Info",
    path: "info",
    schema: z.object({}),
    useCase,
  });
};
