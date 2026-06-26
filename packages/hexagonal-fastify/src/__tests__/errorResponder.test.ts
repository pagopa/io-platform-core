import { NotFoundError } from "@pagopa/hexagonal-core/domain/errors";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { sendErrorResponse } from "../errorResponder.js";

describe("sendErrorResponse", () => {
  it("writes an RFC 7807 problem+json response for a domain error", async () => {
    const app = Fastify();
    app.get("/boom", (_req, reply) =>
      sendErrorResponse(reply, new NotFoundError("User", "id-1")),
    );

    const res = await app.inject({ method: "GET", url: "/boom" });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body.status).toBe(404);
    expect(body.title).toBe("Not Found");
    expect(body.type).toContain("not-found");

    await app.close();
  });

  it("honours a custom typeBaseUrl", async () => {
    const app = Fastify();
    app.get("/boom", (_req, reply) =>
      sendErrorResponse(reply, new NotFoundError("User", "id-1"), {
        typeBaseUrl: "https://errors.example/",
      }),
    );

    const res = await app.inject({ method: "GET", url: "/boom" });

    expect(res.json().type).toBe("https://errors.example/not-found");

    await app.close();
  });
});
