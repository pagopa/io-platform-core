import { Result } from "neverthrow";

import { GenericError } from "../../errors/index.js";

/**
 * An `OutputFormatter` takes a use-case output of type `O` and returns a Result
 * of either a formatted output of type `R` or a {@link GenericError}.
 *
 * It encodes/serializes the output of a {@link UseCase} before it is sent back
 * to the client. The output type `O` is defined by the use case, while the
 * formatted type `R` is defined by the adapter. The error type is always a
 * {@link GenericError}, representing a failure during formatting.
 *
 * @typeParam O Raw use-case output.
 * @typeParam R Encoded/serialized output produced for the transport.
 */
export type OutputFormatter<O, R> = (
  output: O
) => Promise<Result<R, GenericError>>;
