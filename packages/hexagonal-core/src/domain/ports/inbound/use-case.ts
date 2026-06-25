import { Result } from "neverthrow";

import { BaseError } from "../../errors/index.js";

/**
 * A `UseCase` is a function that takes an object as input and returns a Result
 * of either an output or an error.
 *
 * It represents a single unit of business logic executed by the application
 * layer. The input and output types are defined by the caller, while the error
 * type must extend {@link BaseError}.
 *
 * @typeParam Input  Shape of the use-case input (must be an object).
 * @typeParam Output Successful result payload.
 * @typeParam Error  Failure type, constrained to {@link BaseError} subclasses.
 */
export type UseCase<Input extends object, Output, Error extends BaseError> = (
  input: Input,
) => Promise<Result<Output, Error>>;
