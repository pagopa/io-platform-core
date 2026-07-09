import { defineRoute, ProblemJson } from "@pagopa/hexagonal-core/adapters";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  buildOpenApiDocument,
  collectNamedSchemas,
  readSchemaId,
} from "../generate.js";

const ThingSchema = z.object({ id: z.string() }).meta({ id: "Thing" });

describe("readSchemaId", () => {
  it("returns the meta id when present", () => {
    expect(readSchemaId(ThingSchema)).toBe("Thing");
  });

  it("returns undefined when absent", () => {
    expect(readSchemaId(z.string())).toBeUndefined();
  });
});

describe("collectNamedSchemas", () => {
  it("collects nested named schemas", () => {
    const root = z.object({
      items: z.array(ThingSchema),
      thing: ThingSchema,
    });

    const ids = collectNamedSchemas(root).map(readSchemaId);

    expect(ids).toContain("Thing");
  });
});

describe("buildOpenApiDocument", () => {
  const doc = buildOpenApiDocument({
    document: { info: { title: "Test API", version: "1.0.0" } },
    routes: [
      defineRoute({
        method: "get",
        operationId: "getThing",
        path: "/things/{id}",
        request: { path: z.object({ id: z.string() }) },
        response: { 200: ThingSchema, 404: ProblemJson },
      }),
    ],
  });

  it("emits an OpenAPI 3.1 document", () => {
    expect(doc.openapi).toBe("3.1.0");
  });

  it("registers the route path", () => {
    expect(Object.keys(doc.paths ?? {})).toContain("/things/{id}");
  });

  it("registers the reusable ProblemDetails component", () => {
    expect(doc.components?.schemas?.["ProblemDetails"]).toBeDefined();
  });

  it("registers named component schemas", () => {
    expect(doc.components?.schemas?.["Thing"]).toBeDefined();
  });

  it("falls back to a non-empty description when a redirect entry omits one", () => {
    const redirectDoc = buildOpenApiDocument({
      document: { info: { title: "Test API", version: "1.0.0" } },
      routes: [
        defineRoute({
          method: "get",
          operationId: "legacyRedirect",
          path: "/legacy",
          request: {},
          response: { 301: { description: "", redirect: true } },
        }),
      ],
    });

    const redirectResponse = (
      redirectDoc.paths?.["/legacy"] as
        | undefined
        | { get?: { responses?: Record<string, { description?: string }> } }
    )?.get?.responses?.["301"];

    expect(redirectResponse).toHaveProperty("description");
    expect(redirectResponse?.description).toBe("HTTP 301");
  });
});
