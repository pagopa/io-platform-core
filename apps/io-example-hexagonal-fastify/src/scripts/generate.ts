import { writeOpenApiYaml } from "@pagopa/hexagonal-openapi";

import { buildWidgetApiOpenApiDocument, openApiPath } from "../openapi.js";
/**
 * Generates the OpenAPI spec and writes it to `openapi/internal.yaml`
 * in the workspace root.
 */
export const generateOpenApi = async (): Promise<void> => {
  const result = await writeOpenApiYaml({
    doc: buildWidgetApiOpenApiDocument(),
    path: openApiPath,
  });

  if (result.kind === "ok" || result.kind === "unchanged") {
    console.log(`OpenAPI spec written to ${result.path}`);
  }
};
await generateOpenApi();
