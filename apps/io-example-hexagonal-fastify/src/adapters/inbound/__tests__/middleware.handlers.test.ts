import Fastify, {
  type FastifyInstance,
  type InjectOptions,
  type LightMyRequestResponse,
} from "fastify";
import { describe, expect, it } from "vitest";

import { makeGetWidgetAccessUseCase } from "../../../application/use-cases/get-widget-access.use-case.js";
import { makeGetWidgetSummaryUseCase } from "../../../application/use-cases/get-widget-summary.use-case.js";
import { mountAuthenticatedWidgetSummaryHandler } from "../get-authenticated-widget-summary.handler.js";
import { mountGetWidgetAccessHandler } from "../get-widget-access.handler.js";

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

describe("middleware example handlers", () => {
  it("returns 401 when the single authentication middleware rejects the request", async () => {
    const response = await injectMounted(
      (app) =>
        mountAuthenticatedWidgetSummaryHandler(
          app,
          makeGetWidgetSummaryUseCase(),
        ),
      { method: "GET", url: `/api/v1/widgets/${ID}/authenticated-summary` },
    );

    expect(response.statusCode).toBe(401);
    expect(response.json().title).toBe("Unauthorized");
  });

  it("returns the summary after authentication succeeds", async () => {
    const response = await injectMounted(
      (app) =>
        mountAuthenticatedWidgetSummaryHandler(
          app,
          makeGetWidgetSummaryUseCase(),
        ),
      {
        headers: { authorization: "Bearer token" },
        method: "GET",
        url: `/api/v1/widgets/${ID}/authenticated-summary`,
      },
    );

    expect(response.statusCode).toBe(200);
    expect(response.json().id).toBe(ID);
  });

  it("returns 401 before the composed middleware chain can resolve caller data", async () => {
    const response = await injectMounted(
      (app) => mountGetWidgetAccessHandler(app, makeGetWidgetAccessUseCase()),
      {
        headers: {
          "x-user-email": "user@example.com",
          "x-user-id": "user-1",
        },
        method: "GET",
        url: `/api/v1/widgets/${ID}/access`,
      },
    );

    expect(response.statusCode).toBe(401);
  });

  it("returns the context produced by the composed middleware chain", async () => {
    const response = await injectMounted(
      (app) => mountGetWidgetAccessHandler(app, makeGetWidgetAccessUseCase()),
      {
        headers: {
          authorization: "Bearer token",
          "x-forwarded-for": "203.0.113.10, 10.0.0.1",
          "x-user-email": "User@Example.COM",
          "x-user-id": "user-1",
        },
        method: "GET",
        url: `/api/v1/widgets/${ID}/access`,
      },
    );

    expect(response.statusCode).toBe(200);
    expect(response.json()).toStrictEqual({
      caller: { email: "user@example.com", id: "user-1" },
      clientIp: "203.0.113.10",
      widgetId: ID,
    });
  });
});
