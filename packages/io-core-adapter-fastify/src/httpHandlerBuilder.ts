import type { InputValidator, UseCase } from "@pagopa/io-core-domain";

import { BaseError } from "@pagopa/io-core-domain/errors";
import { FastifyReply, FastifyRequest } from "fastify";

import { sendErrorResponse } from "./errorMapper.js";

export const createHttpHandler =
  <TUseCaseInput extends object, O, E extends BaseError>(
    useCase: UseCase<TUseCaseInput, O, E>,
    inputValidator: InputValidator<FastifyRequest, TUseCaseInput>,
    options: {
      successCode: 200 | 201 | 202 | 204;
    } = { successCode: 200 },
  ) =>
  async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Validate input using the provided input validator
    const inputResult = await inputValidator(request);

    if (inputResult.isErr()) {
      return sendErrorResponse(reply, inputResult.error);
    }

    // Call the use case with the validated input
    const result = await useCase(inputResult.value);

    // Handle the result of the use case
    if (result.isErr()) {
      return sendErrorResponse(reply, result.error);
    }

    // TODO-1: Add support for security headers and other common response headers
    // TODO-2: Add support for different success codes and response bodies
    return reply.code(options.successCode).send(result.value);
  };
