import fastify, { type FastifyInstance } from "fastify";

import {
  mountArchiveWidgetHandler,
  mountCreateWidgetHandler,
  mountDeleteWidgetHandler,
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
import { makeGetWidgetAuditUseCase } from "./application/use-cases/get-widget-audit.use-case.js";
import { makeGetWidgetSummaryUseCase } from "./application/use-cases/get-widget-summary.use-case.js";
import { makeGetWidgetUseCase } from "./application/use-cases/get-widget.use-case.js";
import { makeListWidgetsUseCase } from "./application/use-cases/list-widgets.use-case.js";
import { makePatchWidgetUseCase } from "./application/use-cases/patch-widget.use-case.js";
import { makeRefreshWidgetUseCase } from "./application/use-cases/refresh-widget.use-case.js";
import { makeReplaceWidgetUseCase } from "./application/use-cases/replace-widget.use-case.js";

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

  mountListWidgetsHandler(server, makeListWidgetsUseCase());
  mountGetWidgetHandler(server, makeGetWidgetUseCase());
  mountCreateWidgetHandler(server, makeCreateWidgetUseCase());
  mountReplaceWidgetHandler(server, makeReplaceWidgetUseCase());
  mountPatchWidgetHandler(server, makePatchWidgetUseCase());
  mountDeleteWidgetHandler(server, makeDeleteWidgetUseCase());
  mountGetWidgetAuditHandler(server, makeGetWidgetAuditUseCase());
  mountGetWidgetSummaryHandler(server, makeGetWidgetSummaryUseCase());
  mountRefreshWidgetHandler(server, makeRefreshWidgetUseCase());
  mountArchiveWidgetHandler(server, makeArchiveWidgetUseCase());

  return { server };
};
