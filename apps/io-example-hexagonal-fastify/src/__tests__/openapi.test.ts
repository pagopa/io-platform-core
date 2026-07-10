import { writeOpenApiYaml } from "@pagopa/hexagonal-openapi";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

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
