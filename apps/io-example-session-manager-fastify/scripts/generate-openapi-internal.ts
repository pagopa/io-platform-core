import {
  buildOpenApiDocument,
  writeOpenApiYaml,
} from "@pagopa/io-core-openapi";
/**
 * Internal OpenAPI spec generator for io-example-session-manager-fastify.
 *
 * This spec describes what the microservice actually implements:
 * - server points to localhost
 * - no gateway-injected responses (502, 504)
 * - Bearer scheme defined as-is (token pass-through, validated inside the MS)
 *
 * Usage: tsx scripts/generate-openapi-internal.ts [--check]
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "../src/createApp.js";

const { registry } = createApp();

const HERE = fileURLToPath(new URL(".", import.meta.url));
const OUTPUT_PATH = resolve(HERE, "..", "openapi", "openapi-internal.yaml");

const document = buildOpenApiDocument({
  document: {
    info: {
      description:
        "Internal specification for the io-session-manager microservice (Fastify example). " +
        "Describes endpoints as implemented by the MS, without API Management gateway responses.",
      license: { identifier: "MIT", name: "MIT" },
      title: "io-example-session-manager-fastify (internal)",
      version: "0.0.1",
    },
    security: [{ Bearer: [] }],
    servers: [
      {
        description: "Local development server",
        url: "http://localhost:7072",
      },
    ],
  },
  namedSchemas: registry.getSchemas(),
  registerComponents: (reg) => {
    reg.registerComponent("securitySchemes", "Bearer", {
      description:
        "Session Bearer token passed as `Authorization: Bearer <token>`.",
      in: "header",
      name: "Authorization",
      type: "apiKey",
    });
  },
  routes: registry.getAll(),
});

const isCheck = process.argv.includes("--check");

const result = await writeOpenApiYaml({
  check: isCheck,
  doc: document,
  path: OUTPUT_PATH,
});

if (result.kind === "check-failed") {
  console.error(
    "[generate-openapi-internal] " +
      result.path +
      " is out of date. Run `pnpm generate:openapi:internal` and commit the result.",
  );
  console.error(result.diff);
  process.exit(1);
}

if (result.kind === "ok") {
  console.log("[generate-openapi-internal] wrote " + result.path);
} else {
  console.log("[generate-openapi-internal] " + result.path + " is up to date");
}
