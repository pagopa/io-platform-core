import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createHttpResponseFormatter,
  identityFormatter,
} from "../httpOutputStandardSchemaFormatter.js";

describe("createHttpResponseFormatter", () => {
  const schema = z.object({ id: z.string(), n: z.number() });

  it("returns ok with the parsed value when the output matches the schema", async () => {
    const format = createHttpResponseFormatter(schema);

    const result = await format({ id: "a", n: 1 });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ id: "a", n: 1 });
  });

  it("returns a GenericError when the output does not match the schema", async () => {
    const format = createHttpResponseFormatter(schema);

    // @ts-expect-error — intentionally invalid output to exercise the error path
    const result = await format({ id: "a", n: "not-a-number" });

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe("GenericError");
    expect(error.message).toContain("Output encoding failed");
  });
});

describe("identityFormatter", () => {
  it("returns the output unchanged", async () => {
    const value = { any: "thing" };

    const result = await identityFormatter(value);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toBe(value);
  });
});
