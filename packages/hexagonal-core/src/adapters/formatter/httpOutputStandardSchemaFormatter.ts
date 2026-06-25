import type { StandardSchemaV1 } from "@standard-schema/spec";

import { err, ok } from "neverthrow";

import type { OutputFormatter } from "../../domain/ports/inbound/index.js";

import { GenericError } from "../../domain/errors/index.js";

/**
 * Builds an {@link OutputFormatter} that validates/encodes a use-case output
 * against a [Standard Schema](https://github.com/standard-schema/standard-schema).
 *
 * On success it returns the schema-parsed output; on failure it returns a
 * {@link GenericError} — an output that fails its own contract is a server-side
 * bug, not a client error, so it is never surfaced as a 4xx.
 *
 * @typeParam T The Standard Schema describing the output shape.
 * @param schema The schema used to encode/validate the output.
 * @returns An OutputFormatter from the schema input type to its output type.
 */
export const createHttpResponseFormatter =
  <T extends StandardSchemaV1<unknown, unknown>>(
    schema: T,
  ): OutputFormatter<
    StandardSchemaV1.InferInput<T>,
    StandardSchemaV1.InferOutput<T>
  > =>
  async (output) => {
    const result = await schema["~standard"].validate(output);

    if (result.issues) {
      return err(new GenericError("Output encoding failed."));
    }

    return ok(result.value);
  };

/**
 * A pass-through {@link OutputFormatter} that returns its input unchanged.
 * Useful when the use-case output is already in the desired transport shape.
 */
export const identityFormatter: OutputFormatter<unknown, unknown> = async (
  output,
) => ok(output);
