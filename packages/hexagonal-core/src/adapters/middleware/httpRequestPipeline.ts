import type { Result } from "neverthrow";

import { err, ok } from "neverthrow";

import type { BaseError, ValidationError } from "../../domain/errors/index.js";
import type {
  InputValidator,
  UseCase,
} from "../../domain/ports/inbound/index.js";
import type { HttpRequestPayload } from "../validator/httpInputStandardSchemaValidator.js";
import type {
  EmptyHttpMiddlewareContext,
  EnsureHttpMiddlewareSequence,
  HttpMiddlewareContext,
  HttpMiddlewareErrors,
  HttpMiddlewareSequence,
} from "./httpRequestMiddleware.js";

import { executeHttpMiddlewareSequence } from "./httpRequestMiddleware.js";

/** Maps validated request data and middleware context to a use-case input. */
export type ContextualInputMapper<
  ValidatedInput,
  Context extends object,
  UseCaseInput extends object,
> = (input: ValidatedInput, context: Readonly<Context>) => UseCaseInput;

/**
 * Executes the transport-neutral part of an inbound HTTP request.
 *
 * The middleware sequence runs before validation. The input mapper runs only
 * after validation succeeds and receives the final accumulated context.
 */
export async function executeHttpRequestPipeline<
  ValidatedInput,
  UseCaseInput extends object,
  Output,
  UseCaseError extends BaseError,
>(
  payload: Readonly<HttpRequestPayload>,
  validator: InputValidator<HttpRequestPayload, ValidatedInput>,
  inputMapper: ContextualInputMapper<
    ValidatedInput,
    EmptyHttpMiddlewareContext,
    UseCaseInput
  >,
  useCase: UseCase<UseCaseInput, Output, UseCaseError>,
): Promise<Result<Output, UseCaseError | ValidationError>>;
export async function executeHttpRequestPipeline<
  ValidatedInput,
  const Middlewares extends HttpMiddlewareSequence,
  UseCaseInput extends object,
  Output,
  UseCaseError extends BaseError,
>(
  payload: Readonly<HttpRequestPayload>,
  validator: InputValidator<HttpRequestPayload, ValidatedInput>,
  inputMapper: ContextualInputMapper<
    ValidatedInput,
    HttpMiddlewareContext<Middlewares>,
    UseCaseInput
  >,
  useCase: UseCase<UseCaseInput, Output, UseCaseError>,
  middlewares: Middlewares & NoInfer<EnsureHttpMiddlewareSequence<Middlewares>>,
): Promise<
  Result<
    Output,
    HttpMiddlewareErrors<Middlewares> | UseCaseError | ValidationError
  >
>;
export async function executeHttpRequestPipeline<
  ValidatedInput,
  Middlewares extends HttpMiddlewareSequence,
  UseCaseInput extends object,
  Output,
  UseCaseError extends BaseError,
>(
  payload: Readonly<HttpRequestPayload>,
  validator: InputValidator<HttpRequestPayload, ValidatedInput>,
  inputMapper: (
    input: ValidatedInput,
    context: Readonly<
      EmptyHttpMiddlewareContext | HttpMiddlewareContext<Middlewares>
    >,
  ) => UseCaseInput,
  useCase: UseCase<UseCaseInput, Output, UseCaseError>,
  middlewares?: Middlewares &
    NoInfer<EnsureHttpMiddlewareSequence<Middlewares>>,
): Promise<
  Result<
    Output,
    HttpMiddlewareErrors<Middlewares> | UseCaseError | ValidationError
  >
> {
  const contextResult = middlewares
    ? await executeHttpMiddlewareSequence<Middlewares>(payload, middlewares)
    : ok({} as EmptyHttpMiddlewareContext);

  if (contextResult.isErr()) {
    return err(contextResult.error);
  }

  const validationResult = await validator(payload);
  if (validationResult.isErr()) {
    return err(validationResult.error);
  }

  return useCase(inputMapper(validationResult.value, contextResult.value));
}
