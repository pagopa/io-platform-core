import type { UseCase } from "@pagopa/io-core-domain";
import type { BaseError } from "@pagopa/io-core-domain/errors";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { FastifyInstance } from "fastify";

import { createHttpHandler } from "./httpHandlerBuilder.js";
import {
  createHttpRequestValidator,
  RestrictToPayloadKeys,
} from "./validator/httpInputStandardSchemaValidator.js";

export interface EndpointConfig<
  TInput extends object,
  O,
  E extends BaseError,
  TSchema extends StandardSchemaV1<unknown, TInput>,
> {
  method: HttpMethod;
  path: string;
  schema: RestrictToPayloadKeys<TSchema> & TSchema;
  successCode?: 200 | 201 | 202 | 204;
  useCase: UseCase<TInput, O, E>;
}

export type HttpMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

export const mountEndpoint = <
  TInput extends object,
  O,
  E extends BaseError,
  TSchema extends StandardSchemaV1<unknown, TInput>,
>(
  server: FastifyInstance,
  config: EndpointConfig<TInput, O, E, TSchema>,
): void => {
  const inputValidator = createHttpRequestValidator(config.schema);

  server.route({
    handler: createHttpHandler(config.useCase, inputValidator, {
      successCode: config.successCode ?? 200,
    }),
    method: config.method,
    url: config.path,
  });
};
