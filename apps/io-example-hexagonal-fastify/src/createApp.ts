import type { ErrorResponderConfig } from "@pagopa/hexagonal-fastify";

import fastify, { type FastifyInstance } from "fastify";

import {
  mountArchiveWidgetHandler,
  mountAuthenticatedWidgetSummaryHandler,
  mountCreateWidgetHandler,
  mountDeleteWidgetHandler,
  mountGetWidgetAccessHandler,
  mountGetWidgetAuditHandler,
  mountGetWidgetHandler,
  mountGetWidgetSummaryHandler,
  mountListWidgetsHandler,
  mountPatchWidgetHandler,
  mountRefreshWidgetHandler,
  mountReplaceWidgetHandler,
} from "./adapters/inbound/index.js";
import { makeArchiveWidgetUseCase } from "./application/use-cases/archive-widget.use-case.js";
import { makeCreateWidgetUseCase } from "./application/use-cases/create-widget.use-case.js";
import { makeDeleteWidgetUseCase } from "./application/use-cases/delete-widget.use-case.js";
import { makeGetWidgetAccessUseCase } from "./application/use-cases/get-widget-access.use-case.js";
import { makeGetWidgetAuditUseCase } from "./application/use-cases/get-widget-audit.use-case.js";
import { makeGetWidgetSummaryUseCase } from "./application/use-cases/get-widget-summary.use-case.js";
import { makeGetWidgetUseCase } from "./application/use-cases/get-widget.use-case.js";
import { makeListWidgetsUseCase } from "./application/use-cases/list-widgets.use-case.js";
import { makePatchWidgetUseCase } from "./application/use-cases/patch-widget.use-case.js";
import { makeRefreshWidgetUseCase } from "./application/use-cases/refresh-widget.use-case.js";
import { makeReplaceWidgetUseCase } from "./application/use-cases/replace-widget.use-case.js";

const errorResponderConfig: ErrorResponderConfig = {
  typeBaseUrl: "https://example.pagopa.it/problems/",
};

/**
 * Creates the Fastify application and mounts all widget routes directly.
 *
 * The adapter is registry-free: route contracts are mounted on Fastify only, and
 * no OpenAPI registry is created or returned by this factory.
 *
 * @returns The configured Fastify server instance.
 */
export const createApp = (): { server: FastifyInstance } => {
  const server = fastify();

  mountListWidgetsHandler(
    server,
    makeListWidgetsUseCase(),
    errorResponderConfig,
  );
  mountGetWidgetHandler(server, makeGetWidgetUseCase(), errorResponderConfig);
  mountCreateWidgetHandler(
    server,
    makeCreateWidgetUseCase(),
    errorResponderConfig,
  );
  mountReplaceWidgetHandler(
    server,
    makeReplaceWidgetUseCase(),
    errorResponderConfig,
  );
  mountPatchWidgetHandler(
    server,
    makePatchWidgetUseCase(),
    errorResponderConfig,
  );
  mountDeleteWidgetHandler(
    server,
    makeDeleteWidgetUseCase(),
    errorResponderConfig,
  );
  mountGetWidgetAuditHandler(
    server,
    makeGetWidgetAuditUseCase(),
    errorResponderConfig,
  );
  mountGetWidgetSummaryHandler(
    server,
    makeGetWidgetSummaryUseCase(),
    errorResponderConfig,
  );
  mountAuthenticatedWidgetSummaryHandler(
    server,
    makeGetWidgetSummaryUseCase(),
    errorResponderConfig,
  );
  mountGetWidgetAccessHandler(
    server,
    makeGetWidgetAccessUseCase(),
    errorResponderConfig,
  );
  mountRefreshWidgetHandler(
    server,
    makeRefreshWidgetUseCase(),
    errorResponderConfig,
  );
  mountArchiveWidgetHandler(
    server,
    makeArchiveWidgetUseCase(),
    errorResponderConfig,
  );

  return { server };
};
