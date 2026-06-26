import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  defineRoute,
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
      operationId: "getThing",
      path: "/things/{id}",
      request: { path: z.object({ id: z.string() }) },
      response: { 200: z.object({ id: z.string() }) },
    });

    expect(contract.operationId).toBe("getThing");
    expect(contract.method).toBe("get");
  });
});
