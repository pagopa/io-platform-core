import Fastify, {
  type FastifyInstance,
  type InjectOptions,
  type LightMyRequestResponse,
} from "fastify";
import { describe, expect, it } from "vitest";

import { makeArchiveWidgetUseCase } from "../../../application/use-cases/archive-widget.use-case.js";
import { makeGetWidgetSummaryUseCase } from "../../../application/use-cases/get-widget-summary.use-case.js";
import { makeRefreshWidgetUseCase } from "../../../application/use-cases/refresh-widget.use-case.js";
import { mountArchiveWidgetHandler } from "../archive-widget.handler.js";
import { mountGetWidgetSummaryHandler } from "../get-widget-summary.handler.js";
import { mountRefreshWidgetHandler } from "../refresh-widget.handler.js";

const ID = "11111111-1111-4111-8111-111111111111";

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

describe("widget Fastify handler output mapping", () => {
  it("reshapes the internal summary view into the public response (200)", async () => {
    expect.hasAssertions();

    const res = await injectMounted(
      (app) => mountGetWidgetSummaryHandler(app, makeGetWidgetSummaryUseCase()),
      { method: "GET", url: `/api/v1/widgets/${ID}/summary` },
    );

    expect(res.statusCode).toBe(200);
    expect(res.json()).toStrictEqual({
      createdAt: new Date(Date.UTC(2024, 0, 1)).toISOString(),
      description: "Sample widget summary",
      id: ID,
      name: "Sample Widget",
    });
  });

  it("maps the internal job id to a public task id with 202 Accepted", async () => {
    expect.hasAssertions();

    const res = await injectMounted(
      (app) => mountRefreshWidgetHandler(app, makeRefreshWidgetUseCase()),
      { method: "POST", url: `/api/v1/widgets/${ID}/refresh` },
    );

    expect(res.statusCode).toBe(202);
    expect(res.json()).toStrictEqual({
      status: "accepted",
      taskId: "22222222-2222-4222-8222-222222222222",
    });
  });

  it("returns 204 No Content with an empty body for archive", async () => {
    expect.hasAssertions();

    const res = await injectMounted(
      (app) => mountArchiveWidgetHandler(app, makeArchiveWidgetUseCase()),
      { method: "POST", url: `/api/v1/widgets/${ID}/archive` },
    );

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
  });

  it("rejects an invalid summary id before invoking the use case", async () => {
    expect.hasAssertions();

    const res = await injectMounted(
      (app) => mountGetWidgetSummaryHandler(app, makeGetWidgetSummaryUseCase()),
      { method: "GET", url: "/api/v1/widgets/not-a-uuid/summary" },
    );

    expect(res.statusCode).toBe(400);
  });
});
