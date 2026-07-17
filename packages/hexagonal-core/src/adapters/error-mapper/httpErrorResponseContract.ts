import type { Result } from "neverthrow";

import { err, ok } from "neverthrow";

import type { BaseError } from "../../domain/errors/index.js";
import type { ResponseMap } from "../route-contract/routeContract.js";
import type {
  ErrorMapperConfig,
  HttpErrorResponse,
  ProblemDetails,
} from "./errorMapper.js";

import { GenericError } from "../../domain/errors/index.js";
import { ProblemDetailsSchema } from "../http-responses/problemDetails.schema.js";
import {
  getEntrySchema,
  isRedirectEntry,
} from "../route-contract/routeContract.js";
import { mapErrorToHttpResponse } from "./errorMapper.js";

/**
 * Validates an already mapped HTTP error against the response entry declared
 * for its status. The result is a server-side contract error when the status
 * is missing, is a redirect, or rejects either the mapped input or its output.
 */
export const validateHttpErrorResponseAgainstContract = async (
  response: HttpErrorResponse,
  responseMap: ResponseMap,
): Promise<Result<HttpErrorResponse, BaseError>> => {
  const entry = responseMap[response.status];

  if (entry === undefined || isRedirectEntry(entry)) {
    return err(
      new GenericError(
        `HTTP error status ${response.status} is not declared as a response body.`,
      ),
    );
  }

  const result = await getEntrySchema(entry)["~standard"].validate(
    response.jsonBody,
  );

  if (result.issues) {
    return err(
      new GenericError("HTTP error response does not match its contract."),
    );
  }

  const problemResult = await ProblemDetailsSchema["~standard"].validate(
    result.value,
  );

  if (problemResult.issues) {
    return err(new GenericError("HTTP error response output is not RFC 7807."));
  }

  return ok({
    ...response,
    jsonBody: result.value as ProblemDetails,
  });
};

/**
 * Maps a domain error and validates the resulting response against a route
 * contract. Adapters can use the returned result to choose a transport-level
 * fallback without duplicating contract validation logic.
 */
export const mapErrorToHttpResponseAgainstContract = async (
  error: BaseError,
  responseMap: ResponseMap,
  config?: ErrorMapperConfig,
): Promise<Result<HttpErrorResponse, BaseError>> =>
  validateHttpErrorResponseAgainstContract(
    mapErrorToHttpResponse(config)(error),
    responseMap,
  );
