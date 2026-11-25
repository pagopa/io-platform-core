import { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  defineRoute,
  ProblemJson,
  type ResponseMap,
} from "@pagopa/hexagonal-core/adapters";
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

  it("emits an OpenAPI 3.0.3 document", () => {
    expect(doc.openapi).toBe("3.0.3");
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

  it("documents Zod response headers and omits content for 204 and redirects", () => {
    const document = buildOpenApiDocument({
      document: { info: { title: "Test API", version: "1" } },
      routes: [
        defineRoute({
          method: "get",
          operationId: "responseHeaders",
          path: "/headers",
          request: {},
          response: {
            200: {
              headers: z.object({
                "x-job": z.string().min(1),
                "x-optional": z.string().optional(),
              }),
              schema: ThingSchema,
            },
            204: {
              headers: z.object({ "x-version": z.string() }),
              schema: z.object({}),
            },
            302: {
              description: "Moved",
              headers: z.object({ Location: z.string().min(1) }),
              redirect: true,
            },
          },
        }),
      ],
    });
    const responseSchema = z.object({
      content: z.unknown().optional(),
      headers: z
        .record(
          z.string(),
          z.object({
            required: z.boolean().optional(),
            schema: z.unknown().optional(),
          }),
        )
        .optional(),
    });
    const path = z
      .object({
        get: z.object({ responses: z.record(z.string(), responseSchema) }),
      })
      .parse(document.paths?.["/headers"]);
    const responses = path.get.responses;
    expect(responses["200"]?.content).toBeDefined();
    expect(responses["200"]?.headers?.["x-job"]).toMatchObject({
      required: true,
      schema: { minLength: 1, type: "string" },
    });
    expect(responses["200"]?.headers?.["x-optional"]?.required).not.toBe(true);
    expect(responses["204"]?.content).toBeUndefined();
    expect(responses["204"]?.headers?.["x-version"]).toBeDefined();
    expect(responses["302"]?.content).toBeUndefined();
    expect(responses["302"]?.headers?.Location).toMatchObject({
      required: true,
      schema: {
        allOf: [
          { minLength: 1, type: "string" },
          { minLength: 1, type: "string" },
        ],
      },
    });
  });
});

describe("response header documentation", () => {
  it("documents decoded asynchronous pipe output and required redirect Location", () => {
    const target = z
      .string()
      .transform(async (value) => `/${value}`)
      .pipe(z.string().regex(/^\/tasks\//));
    const document = buildOpenApiDocument({
      document: { info: { title: "Test", version: "1" } },
      routes: [
        defineRoute({
          method: "get",
          operationId: "asyncOutput",
          path: "/async-output",
          request: {},
          response: {
            200: {
              headers: z.object({
                "x-id": z
                  .string()
                  .min(9)
                  .transform(async () => "ok")
                  .pipe(z.string().max(2)),
              }),
              schema: z.string(),
            },
            302: {
              description: "Moved",
              headers: z.object({ Location: target.optional() }),
              redirect: true,
            },
          },
        }),
      ],
    });
    const responses = document.paths?.["/async-output"]?.get?.responses;
    expect(responses?.["200"]).toMatchObject({
      headers: {
        "x-id": { required: true, schema: { maxLength: 2, type: "string" } },
      },
    });
    expect(responses?.["302"]).toMatchObject({
      headers: {
        Location: {
          required: true,
          schema: {
            allOf: [
              { pattern: "^\\/tasks\\/", type: "string" },
              { minLength: 1, type: "string" },
            ],
          },
        },
      },
    });
  });
});

describe("numeric redirect documentation", () => {
  it("documents the string wire output of a numeric Location input", () => {
    const document = buildOpenApiDocument({
      document: { info: { title: "Test", version: "1" } },
      routes: [
        defineRoute({
          method: "get",
          operationId: "numericLocation",
          path: "/numeric-location",
          request: {},
          response: {
            302: {
              description: "Moved",
              headers: z.object({
                Location: z
                  .number()
                  .int()
                  .transform((id) => `/tasks/${id}`)
                  .pipe(z.string().regex(/^\/tasks\//)),
              }),
              redirect: true,
            },
          },
        }),
      ],
    });
    expect(
      document.paths?.["/numeric-location"]?.get?.responses?.["302"],
    ).toMatchObject({
      headers: {
        Location: {
          required: true,
          schema: {
            allOf: [
              { pattern: "^\\/tasks\\/", type: "string" },
              { minLength: 1, type: "string" },
            ],
          },
        },
      },
    });
  });
});

describe("response header documentation constraints", () => {
  it("rejects opaque output transforms instead of documenting their input", () => {
    const contract = defineRoute({
      method: "get",
      operationId: "opaque",
      path: "/opaque",
      request: {},
      response: {
        200: {
          headers: z.object({
            "x-id": z
              .string()
              .min(3)
              .transform(async () => "x"),
          }),
          schema: z.string(),
        },
      },
    });
    expect(() =>
      buildOpenApiDocument({
        document: { info: { title: "Test", version: "1" } },
        routes: [contract],
      }),
    ).toThrow(
      /Cannot document output headers for opaque \(200\).*Transforms cannot be represented/,
    );
  });

  it("documents explicit optional and unconstrained Location as required and nonempty", () => {
    const document = buildOpenApiDocument({
      document: { info: { title: "Test", version: "1" } },
      routes: [
        defineRoute({
          method: "get",
          operationId: "locations",
          path: "/locations",
          request: {},
          response: {
            301: {
              description: "Moved",
              headers: z.object({
                Location: z.string().regex(/^\//).optional(),
              }),
              redirect: true,
            },
            302: {
              description: "Moved",
              headers: z.object({ location: z.string() }),
              redirect: true,
            },
          },
        }),
      ],
    });
    const path = z
      .object({
        get: z.object({
          responses: z.record(
            z.string(),
            z.object({ headers: z.record(z.string(), z.unknown()) }),
          ),
        }),
      })
      .parse(document.paths?.["/locations"]);
    expect(path.get.responses["301"]?.headers.Location).toMatchObject({
      required: true,
      schema: {
        allOf: [
          { pattern: "^\\/", type: "string" },
          { minLength: 1, type: "string" },
        ],
      },
    });
    expect(path.get.responses["302"]?.headers.location).toMatchObject({
      required: true,
      schema: { allOf: [{ type: "string" }, { minLength: 1, type: "string" }] },
    });
  });

  it("rejects error header declarations at compile time and document generation", () => {
    const response = {
      200: ThingSchema,
      404: {
        headers: z.object({ "x-error": z.string() }),
        schema: ProblemJson,
      },
    };
    const invalid = () =>
      // @ts-expect-error error response headers are unsupported
      defineRoute({
        method: "get",
        operationId: "invalid",
        path: "/invalid",
        request: {},
        response,
      });
    expect(invalid).toThrow(/404 cannot declare error headers/);
    expect(() =>
      buildOpenApiDocument({
        document: { info: { title: "Test", version: "1" } },
        routes: [
          {
            method: "get",
            operationId: "invalidBypass",
            path: "/invalid",
            request: {},
            response: response as ResponseMap,
          },
        ],
      }),
    ).toThrow(/404 cannot declare error headers/);
  });
});

describe("response output and status categories", () => {
  it("keeps independent recursive definitions distinct and named outputs canonical", () => {
    const shared = z.string().meta({ id: "CanonicalValue" });
    const first: z.ZodType = z.lazy(() =>
      z.object({
        kind: z.literal("first"),
        next: first.optional(),
        value: shared,
      }),
    );
    const second: z.ZodType = z.lazy(() =>
      z.object({
        kind: z.literal("second"),
        next: second.optional(),
        value: shared,
      }),
    );
    const document = buildOpenApiDocument({
      document: { info: { title: "Test", version: "1" } },
      routes: [
        defineRoute({
          method: "get",
          operationId: "recursive",
          path: "/recursive",
          request: {},
          response: { 200: first, 201: second },
        }),
      ],
    });
    const responses = document.paths?.["/recursive"]?.get?.responses as Record<
      string,
      { content: { "application/json": { schema: { $ref: string } } } }
    >;
    const firstRef =
      responses["200"]?.content["application/json"].schema.$ref ?? "";
    const secondRef =
      responses["201"]?.content["application/json"].schema.$ref ?? "";
    expect(firstRef).not.toBe(secondRef);
    const components = document.components?.schemas as Record<string, unknown>;
    for (const [ref, kind] of [
      [firstRef, "first"],
      [secondRef, "second"],
    ] as const) {
      expect(components[ref.split("/").at(-1) ?? ""]).toMatchObject({
        properties: {
          kind: { const: kind },
          next: { $ref: ref },
          value: { $ref: "#/components/schemas/CanonicalValue" },
        },
      });
    }
    expect(components.CanonicalValue).toMatchObject({ type: "string" });
  });

  it("rewrites reusable request components without changing response refs", () => {
    const shared = z
      .string()
      .regex(/^[A-Z]+$/)
      .transform((v) => v.toLowerCase())
      .pipe(z.string().regex(/^[a-z]+$/))
      .meta({ id: "SharedParameterValue" });
    const filter = new OpenAPIRegistry().registerParameter(
      "ReusableFilter",
      z
        .object({ value: shared })
        .openapi({ param: { in: "query", name: "filter" } }),
    );
    const document = buildOpenApiDocument({
      document: { info: { title: "Test", version: "1" } },
      registerComponents: (registry) => {
        registry.registerParameter("ReusableFilter", filter);
        registry.registerComponent("requestBodies", "ReusableBody", {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SharedParameterValue" },
            },
          },
        });
      },
      routes: [
        defineRoute({
          method: "get",
          operationId: "parameter",
          path: "/parameter",
          request: { query: z.object({ filter }) },
          response: { 200: z.object({ value: shared }), 400: ProblemJson },
        }),
      ],
    });
    expect(document.paths?.["/parameter"]?.get?.parameters).toContainEqual({
      $ref: "#/components/parameters/ReusableFilter",
    });
    expect(document.components?.parameters?.ReusableFilter).toMatchObject({
      schema: { $ref: "#/components/schemas/ReusableFilterInput" },
    });
    expect(document.components?.schemas?.ReusableFilterInput).toMatchObject({
      properties: {
        value: { $ref: "#/components/schemas/SharedParameterValueInput" },
      },
    });
    expect(document.components?.requestBodies?.ReusableBody).toMatchObject({
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/SharedParameterValueInput" },
        },
      },
    });
    expect(
      document.components?.schemas?.SharedParameterValueInput,
    ).toMatchObject({ pattern: "^[A-Z]+$" });
    expect(document.components?.schemas?.SharedParameterValue).toMatchObject({
      pattern: "^[a-z]+$",
    });
    expect(
      document.paths?.["/parameter"]?.get?.responses?.["200"],
    ).toMatchObject({
      content: {
        "application/json": {
          schema: {
            properties: {
              value: { $ref: "#/components/schemas/SharedParameterValue" },
            },
          },
        },
      },
    });
  });
});

describe("output and redirect category regressions", () => {
  it("generates quoted numeric statuses and rejects quoted invalid redirects", () => {
    const document = buildOpenApiDocument({
      document: { info: { title: "Test", version: "1" } },
      routes: [
        defineRoute({
          method: "get",
          operationId: "quoted",
          path: "/quoted",
          request: {},
          response: {
            "200": z.string(),
            "302": { description: "Moved", redirect: true },
          },
        }),
      ],
    });
    expect(document.paths?.["/quoted"]?.get?.responses).toMatchObject({
      "200": {
        content: { "application/json": { schema: { type: "string" } } },
      },
      "302": { headers: { location: { required: true } } },
    });
    expect(() =>
      buildOpenApiDocument({
        document: { info: { title: "Test", version: "1" } },
        routes: [
          {
            method: "get",
            operationId: "invalidQuoted",
            path: "/invalid-quoted",
            request: {},
            response: { "200": z.string(), "302": z.string() } as ResponseMap,
          },
        ],
      }),
    ).toThrow(/redirect status category/);
  });

  it("shares transformed output components between body and headers without probing async optionality", () => {
    const shared = z
      .string()
      .regex(/^[A-Z]+$/)
      .transform((v) => v.toLowerCase())
      .pipe(z.string().regex(/^[a-z]+$/))
      .meta({ id: "LowercaseValue" });
    const optional = z
      .string()
      .optional()
      .transform(async (v) => v?.toLowerCase())
      .pipe(
        z
          .string()
          .regex(/^[a-z]+$/)
          .optional(),
      )
      .meta({ id: "OptionalValue" });
    const document = buildOpenApiDocument({
      document: { info: { title: "Test", version: "1" } },
      routes: [
        defineRoute({
          method: "post",
          operationId: "sharedOutput",
          path: "/shared-output",
          request: {
            body: z
              .object({
                input: z
                  .string()
                  .min(7)
                  .transform((v) => v.length),
                shared,
              })
              .meta({ id: "InputEnvelope" }),
          },
          response: {
            200: {
              headers: z.object({ "x-optional": optional, "x-value": shared }),
              schema: z.object({ optional, value: shared }),
            },
            400: ProblemJson,
          },
        }),
      ],
    });
    const operation = document.paths?.["/shared-output"]?.post;
    expect(operation?.requestBody).toMatchObject({
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/InputEnvelopeInput" },
        },
      },
    });
    expect(document.components?.schemas?.InputEnvelopeInput).toMatchObject({
      properties: {
        input: { minLength: 7, type: "string" },
        shared: { $ref: "#/components/schemas/LowercaseValueInput" },
      },
    });
    expect(document.components?.schemas?.LowercaseValueInput).toMatchObject({
      pattern: "^[A-Z]+$",
      type: "string",
    });
    expect(operation?.responses?.["200"]).toMatchObject({
      content: {
        "application/json": {
          schema: {
            properties: {
              optional: { $ref: "#/components/schemas/OptionalValue" },
              value: { $ref: "#/components/schemas/LowercaseValue" },
            },
            required: ["value"],
          },
        },
      },
      headers: {
        "x-optional": {
          required: false,
          schema: { $ref: "#/components/schemas/OptionalValue" },
        },
        "x-value": {
          required: true,
          schema: { $ref: "#/components/schemas/LowercaseValue" },
        },
      },
    });
    expect(document.components?.schemas?.LowercaseValue).toMatchObject({
      pattern: "^[a-z]+$",
      type: "string",
    });
    expect(document.components?.schemas?.OptionalValue).toMatchObject({
      pattern: "^[a-z]+$",
      type: "string",
    });
    expect(operation?.responses?.["400"]).toMatchObject({
      content: {
        "application/problem+json": {
          schema: { $ref: "#/components/schemas/ProblemDetails" },
        },
      },
    });
  });

  it("rejects redirect category mismatches when types are bypassed", () => {
    const responses: ResponseMap[] = [
      { 200: z.string(), 302: z.string() },
      { 200: { description: "Moved", redirect: true } },
      { 304: { description: "Moved", redirect: true } },
    ];
    for (const response of responses) {
      expect(() =>
        buildOpenApiDocument({
          document: { info: { title: "Test", version: "1" } },
          routes: [
            {
              method: "get",
              operationId: "invalidCategory",
              path: "/invalid-category",
              request: {},
              response,
            },
          ],
        }),
      ).toThrow(/must match its redirect status category/);
    }
  });

  it("rejects opaque body output transforms rather than documenting input", () => {
    const contract = defineRoute({
      method: "get",
      operationId: "opaqueBody",
      path: "/opaque-body",
      request: {},
      response: {
        200: z.object({ value: z.string().transform((v) => v.length) }),
      },
    });
    expect(() =>
      buildOpenApiDocument({
        document: { info: { title: "Test", version: "1" } },
        routes: [contract],
      }),
    ).toThrow(
      /Cannot document output body for opaqueBody \(200\).*Transforms cannot be represented/,
    );
  });
});

describe("compact response output", () => {
  it("omits inferred defaults while retaining explicit nested constraints", () => {
    const body = z.object({
      bounded: z.number().int().min(1).max(100),
      catchall: z
        .object({ name: z.string() })
        .catchall(z.number().int().max(7)),
      custom: z.string().uuid().regex(/^a/),
      email: z.email(),
      exclusive: z.number().int().gt(1).lt(10),
      explicitSafe: z
        .number()
        .int()
        .min(Number.MIN_SAFE_INTEGER)
        .max(Number.MAX_SAFE_INTEGER),
      ip: z.ipv4(),
      metadataNumber: z.number().int().meta({ maximum: 23 }),
      metadataObject: z.object({}).meta({ additionalProperties: false }),
      multipleRegex: z.string().email().regex(/^a/).regex(/z$/),
      nested: z.array(
        z.object({ count: z.number().int(), timestamp: z.iso.datetime() }),
      ),
      strict: z.strictObject({ value: z.string() }),
      uuid: z.uuid(),
      wide: z
        .number()
        .int()
        .min(Number.MIN_SAFE_INTEGER - 1)
        .max(Number.MAX_SAFE_INTEGER + 1),
    });
    const document = buildOpenApiDocument({
      document: { info: { title: "Test", version: "1" } },
      routes: [
        defineRoute({
          method: "get",
          operationId: "compact",
          path: "/compact",
          request: {},
          response: {
            200: {
              headers: z.object({
                "x-count": z.number().int(),
                "x-id": z.uuid(),
              }),
              schema: body,
            },
          },
        }),
      ],
    });
    const response = document.paths?.["/compact"]?.get?.responses?.[
      "200"
    ] as unknown as {
      content: { "application/json": { schema: Record<string, unknown> } };
      headers: Record<string, { schema: unknown }>;
    };
    const schema = response.content["application/json"].schema;
    const properties = schema.properties as Record<string, unknown>;
    expect(schema).not.toHaveProperty("additionalProperties");
    expect(properties.uuid).toEqual({ format: "uuid", type: "string" });
    expect(properties.email).toEqual({ format: "email", type: "string" });
    expect(properties.ip).toEqual({ format: "ipv4", type: "string" });
    expect(properties.metadataNumber).toMatchObject({
      maximum: 23,
      type: "integer",
    });
    expect(properties.metadataNumber).not.toHaveProperty("minimum");
    expect(properties.metadataObject).toMatchObject({
      additionalProperties: false,
    });
    expect(properties.multipleRegex).toMatchObject({
      allOf: [{ pattern: "^a" }, { pattern: "z$" }],
      format: "email",
      type: "string",
    });
    expect(properties.custom).toMatchObject({
      allOf: [{ pattern: "^a" }],
      format: "uuid",
      type: "string",
    });
    expect(properties.bounded).toEqual({
      maximum: 100,
      minimum: 1,
      type: "integer",
    });
    expect(properties.exclusive).toEqual({
      exclusiveMaximum: 10,
      exclusiveMinimum: 1,
      type: "integer",
    });
    expect(properties.explicitSafe).toEqual({
      maximum: Number.MAX_SAFE_INTEGER,
      minimum: Number.MIN_SAFE_INTEGER,
      type: "integer",
    });
    expect(properties.wide).toEqual({
      maximum: Number.MAX_SAFE_INTEGER + 1,
      minimum: Number.MIN_SAFE_INTEGER - 1,
      type: "integer",
    });
    expect(properties.strict).toMatchObject({ additionalProperties: false });
    expect(properties.catchall).toMatchObject({
      additionalProperties: { maximum: 7, type: "integer" },
    });
    expect(properties.nested).toEqual({
      items: {
        properties: {
          count: { type: "integer" },
          timestamp: { format: "date-time", type: "string" },
        },
        required: ["count", "timestamp"],
        type: "object",
      },
      type: "array",
    });
    expect(response.headers["x-id"]?.schema).toEqual({
      format: "uuid",
      type: "string",
    });
    expect(response.headers["x-count"]?.schema).toEqual({ type: "integer" });
  });
});

describe("compact transformed response output", () => {
  it("keeps shared input aliases and documents async transformed outputs without executing them", () => {
    const shared = z
      .string()
      .regex(/^[0-9A-F-]+$/)
      .transform((value) => value.toLowerCase())
      .pipe(z.string().uuid())
      .meta({ description: "Shared output", id: "CompactShared" });
    const asyncOutput = z
      .string()
      .transform(async (): Promise<{ id: string; size: number }> => {
        throw new Error("decoder must not execute during documentation");
      })
      .pipe(z.object({ id: z.uuid(), size: z.number().int().max(100) }));
    const document = buildOpenApiDocument({
      document: { info: { title: "Test", version: "1" } },
      routes: [
        defineRoute({
          method: "post",
          operationId: "compactShared",
          path: "/compact-shared",
          request: { body: z.object({ value: shared }) },
          response: {
            200: {
              headers: z.object({ "x-value": shared }),
              schema: z.object({ nested: asyncOutput, value: shared }),
            },
          },
        }),
      ],
    });
    const operation = document.paths?.["/compact-shared"]?.post;
    expect(operation?.requestBody).toMatchObject({
      content: {
        "application/json": {
          schema: {
            properties: {
              value: { $ref: "#/components/schemas/CompactSharedInput" },
            },
          },
        },
      },
    });
    expect(document.components?.schemas?.CompactSharedInput).toMatchObject({
      pattern: "^[0-9A-F-]+$",
      type: "string",
    });
    expect(document.components?.schemas?.CompactShared).toMatchObject({
      description: "Shared output",
      format: "uuid",
      type: "string",
    });
    expect(document.components?.schemas?.CompactShared).not.toHaveProperty(
      "pattern",
    );
    expect(operation?.responses?.["200"]).toMatchObject({
      content: {
        "application/json": {
          schema: {
            properties: {
              nested: {
                properties: {
                  id: { format: "uuid", type: "string" },
                  size: { maximum: 100, type: "integer" },
                },
                type: "object",
              },
              value: { $ref: "#/components/schemas/CompactShared" },
            },
          },
        },
      },
      headers: {
        "x-value": { schema: { $ref: "#/components/schemas/CompactShared" } },
      },
    });
    const response = operation?.responses?.["200"] as unknown as {
      content: {
        "application/json": {
          schema: { properties: { nested: Record<string, unknown> } };
        };
      };
    };
    expect(
      response.content["application/json"].schema.properties.nested,
    ).not.toHaveProperty("additionalProperties");
    expect(
      response.content["application/json"].schema.properties.nested.properties,
    ).toEqual({
      id: { format: "uuid", type: "string" },
      size: { maximum: 100, type: "integer" },
    });
  });
});

const documentFor = (schema: z.ZodObject) =>
  buildOpenApiDocument({
    document: { info: { title: "Test", version: "1" } },
    routes: [
      defineRoute({
        method: "get",
        operationId: "metadata",
        path: "/metadata",
        request: {},
        response: { 200: { schema } },
      }),
    ],
  });
const propertiesOf = (schema: z.ZodObject) => {
  const document = documentFor(schema);
  const response = document.paths?.["/metadata"]?.get?.responses?.[
    "200"
  ] as unknown as {
    content: {
      "application/json": { schema: { properties: Record<string, unknown> } };
    };
  };
  return response.content["application/json"].schema.properties;
};
describe("output format and bound metadata", () => {
  it("retains nondefault format patterns and respects the emitted format", () => {
    const emailPattern = /^.+@example\.com$/;
    const email = z.email({ pattern: emailPattern });
    const versioned = z.uuidv4();
    const customId = z
      .uuid()
      .meta({ description: "Identifier", format: "custom-id" });
    const dual = z.string().email().uuid();
    const properties = propertiesOf(
      z.object({ customId, dual, email, versioned }),
    );
    expect(properties.email).toEqual({
      format: "email",
      pattern: emailPattern.source,
      type: "string",
    });
    expect(properties.versioned).toEqual({
      format: "uuid",
      pattern: z.core.regexes.uuid4.source,
      type: "string",
    });
    expect(properties.customId).toEqual({
      description: "Identifier",
      format: "custom-id",
      pattern: z.core.regexes.uuid().source,
      type: "string",
    });
    expect(properties.dual).toMatchObject({
      allOf: [{ pattern: z.core.regexes.email.source }],
      format: "uuid",
    });
    expect(email.safeParse("person@other.com").success).toBe(false);
    expect(
      versioned.safeParse("00000000-0000-7000-8000-000000000000").success,
    ).toBe(false);
    expect(customId.safeParse("not-a-uuid").success).toBe(false);
  });

  it("retains constraints through named and transformed wrappers without decoding", () => {
    const shared = z.uuid().meta({ id: "WrappedUUID" });
    const wrapped = shared
      .optional()
      .meta({ description: "Wrapped", format: "custom-id" });
    const extraPattern = shared
      .optional()
      .meta({ format: "custom-id", pattern: "^a" });
    const transformed = z
      .string()
      .transform((): string => {
        throw new Error("decoder must not execute");
      })
      .pipe(z.uuid())
      .meta({ format: "custom-id" });
    const document = documentFor(
      z.object({ extraPattern, plain: shared, transformed, wrapped }),
    );
    const response = document.paths?.["/metadata"]?.get?.responses?.[
      "200"
    ] as unknown as {
      content: {
        "application/json": { schema: { properties: Record<string, unknown> } };
      };
    };
    const properties = response.content["application/json"].schema.properties;
    expect(properties.wrapped).toMatchObject({
      description: "Wrapped",
      format: "custom-id",
      pattern: z.core.regexes.uuid().source,
    });
    expect(properties.extraPattern).toMatchObject({
      allOf: [{ pattern: z.core.regexes.uuid().source }],
      format: "custom-id",
      pattern: "^a",
    });
    expect(properties.transformed).toMatchObject({
      format: "custom-id",
      pattern: z.core.regexes.uuid().source,
    });
    expect(document.components?.schemas?.WrappedUUID).toMatchObject({
      format: "uuid",
      type: "string",
    });
    expect(document.components?.schemas?.WrappedUUID).not.toHaveProperty(
      "pattern",
    );
    expect(wrapped.safeParse("not-a-uuid").success).toBe(false);
  });
});

describe("output wrapper pattern intersections", () => {
  it("preserves lazy and explicit pattern constraints across wrapper metadata", () => {
    const shared = z.string().uuid().regex(/^a/).meta({ id: "PatternUUID" });
    const lazy = z.lazy(() => z.uuid()).meta({ format: "custom-id" });
    const layered = z
      .lazy(() => z.uuid())
      .meta({ format: "custom-id" })
      .optional()
      .meta({ pattern: "f$" });
    const optional = z
      .string()
      .uuid()
      .regex(/^a/)
      .optional()
      .meta({ pattern: "f$" });
    const piped = z
      .string()
      .transform(async (): Promise<string> => {
        throw new Error("decoder must not execute");
      })
      .pipe(z.string().uuid().regex(/^a/))
      .optional()
      .meta({ pattern: "f$" });
    const document = documentFor(
      z.object({
        layered,
        lazy,
        optional,
        piped,
        plain: shared,
        wrappedShared: shared.optional().meta({ pattern: "f$" }),
      }),
    );
    const response = document.paths?.["/metadata"]?.get?.responses?.[
      "200"
    ] as unknown as {
      content: {
        "application/json": { schema: { properties: Record<string, unknown> } };
      };
    };
    const properties = response.content["application/json"].schema.properties;
    expect(properties.lazy).toMatchObject({
      format: "custom-id",
      pattern: z.core.regexes.uuid().source,
      type: "string",
    });
    expect(properties.layered).toMatchObject({
      allOf: [{ pattern: z.core.regexes.uuid().source }],
      format: "custom-id",
      pattern: "f$",
    });
    for (const property of [properties.optional, properties.piped])
      expect(property).toMatchObject({
        allOf: [{ pattern: "^a" }],
        format: "uuid",
        pattern: "f$",
      });
    expect(properties.plain).toEqual({
      $ref: "#/components/schemas/PatternUUID",
    });
    expect(properties.wrappedShared).toMatchObject({
      $ref: "#/components/schemas/PatternUUID",
      pattern: "f$",
    });
    expect(document.components?.schemas?.PatternUUID).toMatchObject({
      allOf: [{ pattern: "^a" }],
      format: "uuid",
    });
    expect(
      optional.safeParse("00000000-0000-4000-8000-000000000000").success,
    ).toBe(false);
    expect(lazy.safeParse("not-a-uuid").success).toBe(false);
  });

  it("preserves bound metadata independently of implicit and explicit bounds", () => {
    const properties = propertiesOf(
      z.object({
        exclusive: z
          .number()
          .int()
          .meta({ exclusiveMaximum: 100, exclusiveMinimum: -100 }),
        inclusive: z.number().int().meta({ maximum: 100, minimum: -100 }),
        mixed: z
          .number()
          .int()
          .min(1)
          .max(10)
          .meta({ exclusiveMaximum: 9, exclusiveMinimum: 2 }),
        overwritten: z
          .number()
          .int()
          .min(1)
          .max(10)
          .meta({ maximum: 7, minimum: 3 }),
      }),
    );
    expect(properties.exclusive).toEqual({
      exclusiveMaximum: 100,
      exclusiveMinimum: -100,
      type: "integer",
    });
    expect(properties.inclusive).toEqual({
      maximum: 100,
      minimum: -100,
      type: "integer",
    });
    expect(properties.mixed).toEqual({
      exclusiveMaximum: 9,
      exclusiveMinimum: 2,
      maximum: 10,
      minimum: 1,
      type: "integer",
    });
    expect(properties.overwritten).toEqual({
      maximum: 7,
      minimum: 3,
      type: "integer",
    });
  });
});
