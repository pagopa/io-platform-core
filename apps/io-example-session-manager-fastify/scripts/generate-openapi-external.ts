import {
  buildOpenApiDocument,
  openApiToYaml,
  writeOpenApiYaml,
} from "@pagopa/io-core-openapi";
/**
 * External OpenAPI spec generator for io-example-session-manager-fastify.
 *
 * Starts from the same buildOpenApiDocument call as the internal spec, then
 * applies post-processing to represent what clients see through Application
 * Gateway + API Management:
 *
 *  1. Server URL → https://api-app.io.pagopa.it/api/auth/v1
 *  2. Gateway responses (502 Bad Gateway, 504 Gateway Timeout) added to every path.
 *  3. GET /login gets a 302 Redirect response.
 *  4. POST /assertionConsumerService gets a 301 Redirect response.
 *  5. GET /metadata 200 response content-type corrected to application/xml.
 *
 * Usage: tsx scripts/generate-openapi-external.ts [--check]
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "../src/createApp.js";

const { registry } = createApp();

const HERE = fileURLToPath(new URL(".", import.meta.url));
const OUTPUT_PATH = resolve(HERE, "..", "openapi", "openapi-external.yaml");

// ---------------------------------------------------------------------------
// Build the base document (same data source as internal spec)
// ---------------------------------------------------------------------------

const baseDocument = buildOpenApiDocument({
  document: {
    info: {
      description:
        "Collection of exposed endpoints to interact with user's auth session.",
      license: { identifier: "MIT", name: "MIT" },
      title: "io-example-session-manager-fastify",
      version: "0.0.1",
    },
    security: [{ Bearer: [] }],
    servers: [
      {
        description: "Production API Gateway",
        url: "https://api-app.io.pagopa.it/api/auth/v1",
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

// ---------------------------------------------------------------------------
// Post-processing: mutate the generated document to match external reality
// ---------------------------------------------------------------------------

/**
 * Gateway error responses injected by Application Gateway / APIM on every
 * path. These are not produced by the microservice itself.
 */
const GATEWAY_RESPONSES = {
  "502": { description: "Bad gateway." },
  "503": { description: "Service unavailable." },
  "504": { description: "Gateway timeout." },
} as const;

const paths = baseDocument.paths as Record<
  string,
  Record<string, { responses?: Record<string, unknown> }>
>;

for (const [pathKey, pathItem] of Object.entries(paths)) {
  for (const [method, operation] of Object.entries(pathItem)) {
    if (
      !operation ||
      typeof operation !== "object" ||
      !("responses" in operation)
    ) {
      continue;
    }

    // 1. Add gateway responses to all operations (clone objects to avoid YAML aliases)
    (operation.responses as Record<string, unknown>)["502"] = {
      ...GATEWAY_RESPONSES["502"],
    };
    (operation.responses as Record<string, unknown>)["503"] = {
      ...GATEWAY_RESPONSES["503"],
    };
    (operation.responses as Record<string, unknown>)["504"] = {
      ...GATEWAY_RESPONSES["504"],
    };

    // Correct content-type for GET /metadata 200 response
    if (pathKey.endsWith("/metadata") && method === "get") {
      const successResp = (operation.responses as Record<string, unknown>)[
        "200"
      ] as Record<string, unknown> | undefined;
      if (successResp && "content" in successResp) {
        const content = successResp.content as Record<string, unknown>;
        if ("application/json" in content) {
          content["application/xml"] = content["application/json"];
          delete content["application/json"];
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

const isCheck = process.argv.includes("--check");

const result = await writeOpenApiYaml({
  check: isCheck,
  doc: baseDocument,
  path: OUTPUT_PATH,
});

if (result.kind === "check-failed") {
  console.error(
    "[generate-openapi-external] " +
      result.path +
      " is out of date. Run `pnpm generate:openapi:external` and commit the result.",
  );
  console.error(result.diff);
  process.exit(1);
}

if (result.kind === "ok") {
  console.log("[generate-openapi-external] wrote " + result.path);
} else {
  console.log("[generate-openapi-external] " + result.path + " is up to date");
}
