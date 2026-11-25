import { describe, expect, it } from "vitest";
import { z } from "zod";

import { AuthenticationError } from "../../../domain/errors/index.js";
import { ProblemJson } from "../../http-responses/problemDetails.schema.js";
import {
  type DefaultSuccessOutput,
  defineRoute,
  type EnsureErrorResponsePayloads,
  type EnsureResponseCoversErrors,
  type EnsureValidationErrorDeclared,
  type Equals,
  getEntryDescription,
  getEntrySchema,
  isRedirectEntry,
  type RedirectEntry,
  type SuccessResponseFromMap,
  type SuccessStatusFromMap,
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
  it("normalizes quoted numeric success and error keys without widening", () => {
    const body = z.string();
    const response = {
      "200": body,
      "302": { description: "Moved", redirect: true as const },
      "400": ProblemJson,
      "401": ProblemJson,
    };
    expect(response["401"]).toBe(ProblemJson);
    type Assert<T extends true> = T;
    const statuses: Assert<
      Equals<SuccessStatusFromMap<typeof response>, 200 | 302>
    > = true;
    const noDefault: Assert<
      Equals<DefaultSuccessOutput<typeof response>, never>
    > = true;
    const defaultBody: Assert<
      Equals<DefaultSuccessOutput<{ "200": typeof body }>, string>
    > = true;
    const coverage: EnsureResponseCoversErrors<
      AuthenticationError,
      typeof response
    > = {};
    const validation: EnsureValidationErrorDeclared<
      { query: z.ZodObject },
      typeof response
    > = {};
    const valid: SuccessResponseFromMap<typeof response> = {
      headers: { location: "/ok" },
      status: 302,
    };
    // @ts-expect-error body and status remain correlated
    const invalid: SuccessResponseFromMap<typeof response> = {
      body: "bad",
      status: 302,
    };
    type InvalidError = EnsureErrorResponsePayloads<{ "401": typeof body }>;
    // @ts-expect-error quoted error schemas must accept Problem Details
    const invalidError: InvalidError = {};
    const invalidRoute = () =>
      // @ts-expect-error quoted redirects require redirect entries
      defineRoute({
        method: "get",
        path: "/invalid",
        request: {},
        response: { "200": body, "302": body },
      });
    expect([
      statuses,
      noDefault,
      defaultBody,
      coverage,
      validation,
      valid,
      invalid,
      invalidError,
    ]).toHaveLength(8);
    expect(invalidRoute).toThrow(/redirect status category/);
  });

  it("rejects noncanonical numeric status keys at definition", () => {
    const invalidRoute = () =>
      // @ts-expect-error noncanonical numeric keys cannot be used as statuses
      defineRoute({
        method: "get",
        path: "/noncanonical",
        request: {},
        response: { 200: z.string(), "0302": z.string() },
      });
    expect(invalidRoute).toThrow(/redirect status category/);
    const noncanonicalSuccess = () =>
      // @ts-expect-error noncanonical success keys are rejected even when the category matches
      defineRoute({
        method: "get",
        path: "/noncanonical-success",
        request: {},
        response: { "0200": z.string() },
      });
    expect(noncanonicalSuccess).not.toThrow();
  });

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
