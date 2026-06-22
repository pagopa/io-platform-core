import { Result } from "neverthrow";

import { ValidationError } from "../../errors/index.js";

/**
 * An `InputValidator` takes a transport-level input of type `R` (e.g. an HTTP
 * request) and returns a Result containing either a validated, typed input of
 * type `I` or a {@link ValidationError}.
 *
 * It is the boundary that turns untrusted, weakly-typed transport data into a
 * trusted, strongly-typed value before it reaches a {@link UseCase}.
 *
 * @typeParam R Raw request/input type provided by an inbound adapter.
 * @typeParam I Validated, typed input handed to a use case.
 */
export type InputValidator<R, I> = (
  request: R
) => Promise<Result<I, ValidationError>>;
