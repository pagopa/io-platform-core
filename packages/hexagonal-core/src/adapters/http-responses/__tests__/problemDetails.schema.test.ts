import { describe, expect, it } from "vitest";

import type { ProblemDetails } from "../../error-mapper/errorMapper.js";

import { ProblemDetailsSchema, ProblemJson } from "../problemDetails.schema.js";

describe("ProblemDetailsSchema", () => {
  const sample = {
    detail: "Unable to find User with id id-123",
    status: 404,
    title: "Not Found",
    type: "https://example.pagopa.it/problems/not-found",
  };

  it("parses a valid RFC 7807 problem object", () => {
    const parsed = ProblemDetailsSchema.parse(sample);

    // Compile-time guarantee: the schema output stays assignable to the core
    // `ProblemDetails` interface, keeping the two definitions in sync.
    const asInterface: ProblemDetails = parsed;

    expect(asInterface).toEqual(sample);
  });

  it("exposes the OpenAPI component id via native zod metadata", () => {
    expect(ProblemDetailsSchema.meta()?.id).toBe("ProblemDetails");
  });

  it("rejects a non-integer status", () => {
    const result = ProblemDetailsSchema.safeParse({ ...sample, status: 1.5 });

    expect(result.success).toBe(false);
  });

  it("rejects a non-URL type", () => {
    const result = ProblemDetailsSchema.safeParse({
      ...sample,
      type: "not a url",
    });

    expect(result.success).toBe(false);
  });

  it("exposes ProblemJson as an alias of ProblemDetailsSchema", () => {
    expect(ProblemJson).toBe(ProblemDetailsSchema);
  });
});
