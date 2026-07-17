import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AuthenticationError } from "../../../domain/errors/index.js";
import { ProblemJson } from "../../http-responses/problemDetails.schema.js";
import {
  defineRoute,
  type EnsureErrorResponsePayloads,
  type EnsureResponseCoversErrors,
  getEntryDescription,
  getEntrySchema,
  isRedirectEntry,
  type RedirectEntry,
} from "../routeContract.js";

describe("isRedirectEntry", () => {
  it("returns true for a redirect entry", () => {
    const entry: RedirectEntry = { description: "Moved", redirect: true };

    expect(isRedirectEntry(entry)).toBe(true);
  });

  it("returns false for a plain zod schema", () => {
    expect(isRedirectEntry(z.object({}))).toBe(false);
  });

  it("returns false for a schema wrapper object", () => {
    expect(isRedirectEntry({ schema: z.string() })).toBe(false);
  });
});

describe("getEntrySchema", () => {
  it("returns a plain zod schema as-is", () => {
    const schema = z.string();

    expect(getEntrySchema(schema)).toBe(schema);
  });

  it("unwraps a schema wrapper object", () => {
    const schema = z.string();

    expect(getEntrySchema({ description: "d", schema })).toBe(schema);
  });
});

describe("getEntryDescription", () => {
  it("returns undefined for a plain zod schema", () => {
    expect(getEntryDescription(z.string())).toBeUndefined();
  });

  it("returns the description of a wrapper object", () => {
    expect(
      getEntryDescription({ description: "created", schema: z.string() }),
    ).toBe("created");
  });

  it("returns the description of a redirect entry", () => {
    expect(getEntryDescription({ description: "moved", redirect: true })).toBe(
      "moved",
    );
  });
});

describe("defineRoute", () => {
  it("returns the contract unchanged (identity helper)", () => {
    const contract = defineRoute({
      method: "get",
      path: "/things/{id}",
      request: { path: z.object({ id: z.string() }) },
      response: { 200: z.object({ id: z.string() }) },
    });

    expect(contract.method).toBe("get");
    expect(contract.path).toBe("/things/{id}");
  });

  it("rejects arbitrary properties at compile time (no hidden injection)", () => {
    const contract = defineRoute({
      // @ts-expect-error - extra properties are not allowed on the minimal RouteContract
      extra: "meta",
      method: "get",
      path: "/things/{id}",
      request: { path: z.object({ id: z.string() }) },
      response: { 200: z.object({ id: z.string() }) },
    });

    expect(contract.method).toBe("get");
  });
});

describe("route response type guards", () => {
  it("requires every mapped error status to be declared", () => {
    type MissingAuthenticationResponse = EnsureResponseCoversErrors<
      AuthenticationError,
      { 200: typeof ProblemJson }
    >;

    // @ts-expect-error - 401 is missing from the response map
    const missingResponse: MissingAuthenticationResponse = {};

    expect(missingResponse).toEqual({});
  });

  it("requires error response schemas to accept RFC 7807 payloads", () => {
    const invalidSchema = z.string();
    expect(invalidSchema).toBeDefined();
    type InvalidPayloadResponse = EnsureErrorResponsePayloads<{
      401: typeof invalidSchema;
    }>;

    // @ts-expect-error - a string schema cannot encode Problem Details
    const invalidResponse: InvalidPayloadResponse = {};

    expect(invalidResponse).toEqual({});
  });

  it("rejects transforms that return a non-Problem Details payload", () => {
    const invalidTransformedSchema = z
      .unknown()
      .transform(() => ({ invalid: true }));
    expect(invalidTransformedSchema).toBeDefined();
    type InvalidTransformedResponse = EnsureErrorResponsePayloads<{
      401: typeof invalidTransformedSchema;
    }>;

    // @ts-expect-error - the transformed output is not Problem Details
    const invalidResponse: InvalidTransformedResponse = {};

    expect(invalidResponse).toEqual({});
  });
});
