import type { InputValidator, UseCase } from "@pagopa/io-core-domain";

import { BaseError } from "@pagopa/io-core-domain/errors";
import { FastifyReply, FastifyRequest } from "fastify";

import { sendErrorResponse } from "./errorMapper.js";

export const createHttpHandler =
  <TUseCaseInput extends object, O, E extends BaseError>(
    useCase: UseCase<TUseCaseInput, O, E>,
    inputValidator: InputValidator<FastifyRequest, TUseCaseInput>,
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

    return reply.code(200).send(result.value);
  };
