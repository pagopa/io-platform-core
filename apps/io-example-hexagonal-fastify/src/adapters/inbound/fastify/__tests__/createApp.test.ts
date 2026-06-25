import type { InjectOptions, LightMyRequestResponse } from "fastify";

import { describe, expect, it } from "vitest";

import { createApp } from "../../../../createApp.js";

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

describe("createApp", () => {
  const routes = [
    { method: "GET", url: "/api/v1/widgets" },
    { method: "GET", url: `/api/v1/widgets/${ID}` },
    { method: "POST", payload: { name: "x" }, url: "/api/v1/widgets" },
    {
      method: "PUT",
      payload: { name: "x" },
      url: `/api/v1/widgets/${ID}`,
    },
    { method: "PATCH", payload: {}, url: `/api/v1/widgets/${ID}` },
    { method: "DELETE", url: `/api/v1/widgets/${ID}` },
    {
      headers: { "x-request-id": "req-1" },
      method: "GET",
      url: `/api/v1/widgets/${ID}/audit`,
    },
  ] satisfies readonly InjectOptions[];

  it.each(routes)(
    "mounts $method $url and maps the not implemented use case to 500",
    async (request) => {
      const { server } = createApp();

      try {
        const res = await server.inject(request);

        expectProblemJson(res, 500);
        expect(res.json().title).toBe("Internal Server Error");
      } finally {
        await server.close();
      }
    },
  );

  it("returns 404 for unknown routes", async () => {
    const { server } = createApp();

    try {
      const res = await server.inject({ method: "GET", url: "/nope" });

      expect(res.statusCode).toBe(404);
    } finally {
      await server.close();
    }
  });
});
