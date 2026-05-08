/**
 * Static generator for the io-example-hono OpenAPI specification.
 * Bootstraps the app to access the OpenAPI registry populated by route
 * definitions, and writes the resulting document to
 * `openapi/openapi.yaml`.
 *
 * Pass `--check` to fail when the generated spec differs from what is
 * already on disk (used in CI to detect drift between code and spec).
 *
 * Usage: tsx scripts/generate-openapi.ts [--check]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { stringify } from "yaml";

import { createApp } from "../src/createApp.js";

const app = createApp();

const document = app.getOpenAPIDocument({
  info: {
    description:
      "Example Hono app following the hexagonal architecture pattern.",
    license: { name: "MIT" },
    title: "io-example-hono",
    version: "0.0.1",
  },
  openapi: "3.1.0",
  security: [],
  servers: [
    {
      description: "Local development server",
      url: "http://localhost:3000",
    },
  ],
});

// Register security scheme
app.openAPIRegistry.registerComponent("securitySchemes", "functionKey", {
  description:
    "Azure Functions host key passed as the `x-functions-key` header.",
  in: "header",
  name: "x-functions-key",
  type: "apiKey",
});

const HERE = fileURLToPath(new URL(".", import.meta.url));
const OUTPUT_PATH = resolve(HERE, "..", "openapi", "openapi.yaml");

const yamlContent = stringify(document, { lineWidth: 0 });

const isCheck = process.argv.includes("--check");

if (isCheck) {
  let existing: string;
  try {
    existing = await readFile(OUTPUT_PATH, "utf-8");
  } catch {
    console.error(
      `[generate-openapi] ${OUTPUT_PATH} does not exist. Run \`pnpm generate:openapi\` and commit the result.`,
    );
    process.exit(1);
  }
  if (existing !== yamlContent) {
    console.error(
      `[generate-openapi] ${OUTPUT_PATH} is out of date. Run \`pnpm generate:openapi\` and commit the result.`,
    );
    process.exit(1);
  }
  console.log(`[generate-openapi] ${OUTPUT_PATH} is up to date`);
} else {
  await mkdir(resolve(HERE, "..", "openapi"), { recursive: true });
  await writeFile(OUTPUT_PATH, yamlContent, "utf-8");
  console.log(`[generate-openapi] wrote ${OUTPUT_PATH}`);
}
