import type {
  InputValidator,
  OutputFormatter,
  UseCase,
} from "@pagopa/io-core-domain";

import { HttpRequest, HttpResponseInit } from "@azure/functions";
import { BaseError } from "@pagopa/io-core-domain/errors";

import { mapErrorToHttpResponse } from "./errorMapper.js";

export const createHttpHandler =
  <TUseCaseInput extends object, O, E extends BaseError, R>(
    useCase: UseCase<TUseCaseInput, O, E>,
    inputValidator: InputValidator<HttpRequest, TUseCaseInput>,
    outputFormatter: OutputFormatter<O, R>,
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

    // Format the output using the provided output formatter
    const formatted = await outputFormatter(result.value);

    if (formatted.isErr()) {
      return mapErrorToHttpResponse(formatted.error);
    }

    // TODO: Add support for security headers and other common response headers
    return { jsonBody: formatted.value, status: options.successCode };
  };
