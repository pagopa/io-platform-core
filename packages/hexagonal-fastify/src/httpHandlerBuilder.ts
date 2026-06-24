import type { BaseError } from "@pagopa/hexagonal-core/domain/errors";
import type {
  InputValidator,
  UseCase,
} from "@pagopa/hexagonal-core/domain/ports";
import type { FastifyReply, FastifyRequest } from "fastify";

import { sendErrorResponse } from "./errorResponder.js";

/**
 * Emits the response for a successful use-case output. Output mapping and
 * schema encode/decode are performed by the caller (the mount adapter) inside
 * this callback, so the success path is owned entirely by the adapter rather
 * than by a shared formatter.
 *
 * @typeParam O Use-case output type.
 */
export type SuccessResponder<O> = (
  output: O,
  reply: FastifyReply
) => Promise<FastifyReply>;

/** HTTP success status codes an HTTP handler may emit (incl. redirects). */
export type SuccessStatusCode = 200 | 201 | 202 | 204 | 301 | 302;

/**
 * Builds a Fastify route handler from a use case, an input validator and a
 * success responder, wiring the hexagonal flow end to end:
 *
 *  1. validate the request → on failure, reply with a problem+json error;
 *  2. run the use case → on failure, reply with a problem+json error;
 *  3. otherwise delegate the success path to `onSuccess`.
 *
 * Every error branch is delegated to {@link sendErrorResponse}, which maps the
 * domain error via the core error mapper. The success path — output mapping and
 * schema encode/decode — is owned by `onSuccess`, supplied by the mount adapter.
 *
 * @typeParam TUseCaseInput Validated input handed to the use case.
 * @typeParam O Use-case output type.
 * @typeParam E Domain error type returned by the use case.
 * @param useCase The application use case to execute.
 * @param inputValidator Validates a `FastifyRequest` into the use-case input.
 * @param onSuccess Emits the response for a successful use-case output.
 * @returns A Fastify handler `(request, reply) => Promise<FastifyReply>`.
 */
export const createHttpHandler =
  <TUseCaseInput extends object, O, E extends BaseError>(
    useCase: UseCase<TUseCaseInput, O, E>,
    inputValidator: InputValidator<FastifyRequest, TUseCaseInput>,
    onSuccess: SuccessResponder<O>
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

    return onSuccess(result.value, reply);
  };
