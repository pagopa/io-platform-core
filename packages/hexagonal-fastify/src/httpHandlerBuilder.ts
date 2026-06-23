import type { BaseError } from "@pagopa/hexagonal-core/domain/errors";
import type {
  InputValidator,
  OutputFormatter,
  UseCase,
} from "@pagopa/hexagonal-core/domain/ports";
import type { FastifyReply, FastifyRequest } from "fastify";

import { sendErrorResponse } from "./errorResponder.js";

/** HTTP success status codes an HTTP handler may emit. */
export type SuccessStatusCode = 200 | 201 | 202 | 204;

/**
 * Builds a Fastify route handler from a use case, an input validator and an
 * output formatter, wiring the hexagonal flow end to end:
 *
 *  1. validate the request → on failure, reply with a problem+json error;
 *  2. run the use case → on failure, reply with a problem+json error;
 *  3. format the output → on failure, reply with a problem+json error;
 *  4. otherwise reply with `successCode` and the formatted body.
 *
 * Every error branch is delegated to {@link sendErrorResponse}, which maps the
 * domain error via the core error mapper.
 *
 * @typeParam TUseCaseInput Validated input handed to the use case.
 * @typeParam O Use-case output type.
 * @typeParam E Domain error type returned by the use case.
 * @typeParam R Formatted (transport) output type.
 * @param useCase The application use case to execute.
 * @param inputValidator Validates a `FastifyRequest` into the use-case input.
 * @param outputFormatter Encodes the use-case output for transport.
 * @param options Success status code to emit (defaults to `200`).
 * @returns A Fastify handler `(request, reply) => Promise<FastifyReply>`.
 */
export const createHttpHandler =
  <TUseCaseInput extends object, O, E extends BaseError, R>(
    useCase: UseCase<TUseCaseInput, O, E>,
    inputValidator: InputValidator<FastifyRequest, TUseCaseInput>,
    outputFormatter: OutputFormatter<O, R>,
    options: { successCode: SuccessStatusCode } = { successCode: 200 }
  ) =>
  async (
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<FastifyReply> => {
    const inputResult = await inputValidator(request);
    if (inputResult.isErr()) {
      return sendErrorResponse(reply, inputResult.error);
    }

    const result = await useCase(inputResult.value);
    if (result.isErr()) {
      return sendErrorResponse(reply, result.error);
    }

    const formatted = await outputFormatter(result.value);
    if (formatted.isErr()) {
      return sendErrorResponse(reply, formatted.error);
    }

    return reply.code(options.successCode).send(formatted.value);
  };
