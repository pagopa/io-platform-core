import type { AnyRouteContract } from "@pagopa/hexagonal-openapi";

import { buildOpenApiDocument } from "@pagopa/hexagonal-openapi";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { archiveWidgetContract } from "./adapters/inbound/archive-widget.handler.js";
import { createWidgetContract } from "./adapters/inbound/create-widget.handler.js";
import { deleteWidgetContract } from "./adapters/inbound/delete-widget.handler.js";
import { getAuthenticatedWidgetSummaryContract } from "./adapters/inbound/get-authenticated-widget-summary.handler.js";
import { getWidgetAccessContract } from "./adapters/inbound/get-widget-access.handler.js";
import { getWidgetAuditContract } from "./adapters/inbound/get-widget-audit.handler.js";
import { getWidgetSummaryContract } from "./adapters/inbound/get-widget-summary.handler.js";
import { getWidgetContract } from "./adapters/inbound/get-widget.handler.js";
import { listWidgetsContract } from "./adapters/inbound/list-widgets.handler.js";
import { patchWidgetContract } from "./adapters/inbound/patch-widget.handler.js";
import { refreshWidgetContract } from "./adapters/inbound/refresh-widget.handler.js";
import { replaceWidgetContract } from "./adapters/inbound/replace-widget.handler.js";

interface PackageJson {
  version: string;
}

const packageJson = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../package.json", import.meta.url)),
    "utf8",
  ),
) as PackageJson;

/**
 * All public route contracts exposed by the widget API.
 *
 * The array is used both to generate the OpenAPI document and by the
 * alignment test to verify that the committed spec is up to date.
 */
export const widgetApiRoutes: readonly AnyRouteContract[] = [
  listWidgetsContract,
  getWidgetContract,
  createWidgetContract,
  replaceWidgetContract,
  patchWidgetContract,
  deleteWidgetContract,
  getAuthenticatedWidgetSummaryContract,
  getWidgetAccessContract,
  getWidgetAuditContract,
  getWidgetSummaryContract,
  refreshWidgetContract,
  archiveWidgetContract,
];

/**
 * Builds the OpenAPI 3.1 document for the widget API.
 *
 * The document version is read from the workspace `package.json` so that
 * the generated spec stays aligned with the application version.
 */
export const buildWidgetApiOpenApiDocument = (): ReturnType<
  typeof buildOpenApiDocument
> =>
  buildOpenApiDocument({
    document: {
      info: {
        title: "IO Example Hexagonal Fastify API",
        version: packageJson.version,
      },
    },
    routes: widgetApiRoutes,
  });

export const openApiPath = fileURLToPath(
  new URL("../openapi/internal.yaml", import.meta.url),
);
