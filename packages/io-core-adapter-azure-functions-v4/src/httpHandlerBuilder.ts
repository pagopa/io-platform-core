import type { InputValidator, UseCase } from "@pagopa/io-core-domain";

import { HttpRequest, HttpResponseInit } from "@azure/functions";
import { BaseError } from "@pagopa/io-core-domain/errors";

import { mapErrorToHttpResponse } from "./errorMapper.js";

export const createHttpHandler =
  <TUseCaseInput extends object, O, E extends BaseError>(
    useCase: UseCase<TUseCaseInput, O, E>,
    inputValidator: InputValidator<HttpRequest, TUseCaseInput>,
    options: {
      successCode: 200 | 201 | 202 | 204;
    } = { successCode: 200 },
  ) =>
  async (request: HttpRequest): Promise<HttpResponseInit> => {
    // Validate input using the provided input validator
    const inputResult = await inputValidator(request);

    if (inputResult.isErr()) {
      return mapErrorToHttpResponse(inputResult.error);
    }

    // Call the use case with the validated input
    const result = await useCase(inputResult.value);

    // Handle the result of the use case
    if (result.isErr()) {
      return mapErrorToHttpResponse(result.error);
    }

    // TODO-1: Add support for security headers and other common response headers
    // TODO-2: Add support for different success codes and response bodies
    return { jsonBody: result.value, status: options.successCode };
  };
