import type { InputValidator, UseCase } from "@pagopa/io-core-domain";

import { HttpRequest, HttpResponseInit } from "@azure/functions";
import { BaseError } from "@pagopa/io-core-domain/errors";

import { mapErrorToHttpResponse } from "./errorMapper.js";

export const createHttpHandler =
  <TUseCaseInput extends object, O, E extends BaseError>(
    useCase: UseCase<TUseCaseInput, O, E>,
    inputValidator: InputValidator<HttpRequest, TUseCaseInput>,
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

    return { jsonBody: result.value };
  };
