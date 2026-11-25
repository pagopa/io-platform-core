import { writeOpenApiYaml } from "@pagopa/hexagonal-openapi";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { buildWidgetApiOpenApiDocument } from "../openapi.js";

interface PackageJson {
  version: string;
}

const packageJson = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../package.json", import.meta.url)),
    "utf8",
  ),
) as PackageJson;

const openApiPath = fileURLToPath(
  new URL("../../openapi/internal.yaml", import.meta.url),
);

describe("OpenAPI spec", () => {
  it("reuses the task identifier in the response body and header", () => {
    const doc = buildWidgetApiOpenApiDocument();
    expect(doc.components?.schemas?.WidgetTaskId).toMatchObject({
      format: "uuid",
      type: "string",
    });
    expect(doc.components?.schemas?.WidgetTaskId).not.toHaveProperty("pattern");
    const response =
      doc.paths?.["/api/v1/widgets/{id}/refresh"]?.post?.responses?.["202"];
    expect(response).toMatchObject({
      content: {
        "application/json": {
          schema: {
            properties: {
              taskId: { $ref: "#/components/schemas/WidgetTaskId" },
            },
          },
        },
      },
      headers: {
        "x-widget-task-id": {
          required: true,
          schema: { $ref: "#/components/schemas/WidgetTaskId" },
        },
      },
    });
  });

  it("keeps explicit query limits and emits compact response schemas", () => {
    const doc = buildWidgetApiOpenApiDocument();
    const operation = doc.paths?.["/api/v1/widgets"]?.get;
    expect(operation?.parameters).toContainEqual({
      in: "query",
      name: "pageSize",
      required: false,
      schema: { maximum: 100, minimum: 1, type: "integer" },
    });
    const response = operation?.responses?.["200"] as unknown as {
      content: {
        "application/json": { schema: { properties: Record<string, unknown> } };
      };
    };
    const schema = response.content["application/json"].schema;
    expect(schema).not.toHaveProperty("additionalProperties");
    expect(schema.properties.page).toEqual({ minimum: 1, type: "integer" });
    expect(schema.properties.pageSize).toEqual({ minimum: 1, type: "integer" });
    expect(schema.properties.total).toEqual({ minimum: 0, type: "integer" });
    expect(schema.properties.items).toMatchObject({
      items: {
        properties: {
          createdAt: { format: "date-time", type: "string" },
          id: { format: "uuid", type: "string" },
        },
      },
    });
    const items = z
      .object({
        items: z.looseObject({ properties: z.record(z.string(), z.unknown()) }),
      })
      .parse(schema.properties.items);
    const item = items.items;
    expect(item).not.toHaveProperty("additionalProperties");
    expect(item.properties.id).not.toHaveProperty("pattern");
    expect(item.properties.createdAt).not.toHaveProperty("pattern");
  });

  it("is aligned with the generated document and uses package.json version", async () => {
    const doc = buildWidgetApiOpenApiDocument() as {
      info: { version: string };
    };

    expect(doc.info.version).toBe(packageJson.version);

    const result = await writeOpenApiYaml({
      check: true,
      doc,
      path: openApiPath,
    });

    if (result.kind === "check-failed") {
      throw new Error(`OpenAPI spec is out of sync:\n${result.diff}`);
    }

    expect(result.kind).toBe("unchanged");
  });
});
