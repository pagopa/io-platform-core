import Fastify, {
  type FastifyInstance,
  type InjectOptions,
  type LightMyRequestResponse,
} from "fastify";
import { describe, expect, it } from "vitest";

import { makeCreateWidgetUseCase } from "../../../../application/use-cases/create-widget.use-case.js";
import { makeDeleteWidgetUseCase } from "../../../../application/use-cases/delete-widget.use-case.js";
import { makeGetWidgetAuditUseCase } from "../../../../application/use-cases/get-widget-audit.use-case.js";
import { makeGetWidgetUseCase } from "../../../../application/use-cases/get-widget.use-case.js";
import { makeReplaceWidgetUseCase } from "../../../../application/use-cases/replace-widget.use-case.js";
import { mountCreateWidgetHandler } from "../create-widget.handler.js";
import { mountDeleteWidgetHandler } from "../delete-widget.handler.js";
import { mountGetWidgetAuditHandler } from "../get-widget-audit.handler.js";
import { mountGetWidgetHandler } from "../get-widget.handler.js";
import { mountReplaceWidgetHandler } from "../replace-widget.handler.js";

const ID = "11111111-1111-4111-8111-111111111111";

const expectProblemJson = (
  res: LightMyRequestResponse,
  statusCode: number,
): void => {
  expect(res.statusCode).toBe(statusCode);
  expect(String(res.headers["content-type"])).toContain(
    "application/problem+json",
  );
};

const injectMounted = async (
  mount: (server: FastifyInstance) => void,
  request: InjectOptions,
): Promise<LightMyRequestResponse> => {
  const app = Fastify();
  mount(app);

  try {
    return await app.inject(request);
  } finally {
    await app.close();
  }
};

describe("widget Fastify handler validation", () => {
  it("rejects an invalid get-widget id before invoking the use case", async () => {
    expect.hasAssertions();

    const res = await injectMounted(
      (app) => mountGetWidgetHandler(app, makeGetWidgetUseCase()),
      { method: "GET", url: "/api/v1/widgets/not-a-uuid" },
    );

    expectProblemJson(res, 400);
  });

  it("rejects create-widget bodies without a name", async () => {
    expect.hasAssertions();

    const res = await injectMounted(
      (app) => mountCreateWidgetHandler(app, makeCreateWidgetUseCase()),
      { method: "POST", payload: {}, url: "/api/v1/widgets" },
    );

    expectProblemJson(res, 400);
  });

  it("rejects replace-widget bodies without a name", async () => {
    expect.hasAssertions();

    const res = await injectMounted(
      (app) => mountReplaceWidgetHandler(app, makeReplaceWidgetUseCase()),
      { method: "PUT", payload: {}, url: `/api/v1/widgets/${ID}` },
    );

    expectProblemJson(res, 400);
  });

  it("rejects audit requests without x-request-id", async () => {
    expect.hasAssertions();

    const res = await injectMounted(
      (app) => mountGetWidgetAuditHandler(app, makeGetWidgetAuditUseCase()),
      { method: "GET", url: `/api/v1/widgets/${ID}/audit` },
    );

    expectProblemJson(res, 400);
  });

  it("rejects audit requests with an empty x-request-id", async () => {
    expect.hasAssertions();

    const res = await injectMounted(
      (app) => mountGetWidgetAuditHandler(app, makeGetWidgetAuditUseCase()),
      {
        headers: { "x-request-id": "" },
        method: "GET",
        url: `/api/v1/widgets/${ID}/audit`,
      },
    );

    expectProblemJson(res, 400);
  });

  it("rejects an invalid delete-widget id before invoking the use case", async () => {
    expect.hasAssertions();

    const res = await injectMounted(
      (app) => mountDeleteWidgetHandler(app, makeDeleteWidgetUseCase()),
      { method: "DELETE", url: "/api/v1/widgets/not-a-uuid" },
    );

    expectProblemJson(res, 400);
  });
});
