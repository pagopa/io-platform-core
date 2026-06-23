import {
  createHttpResponseFormatter,
  identityFormatter,
} from "@pagopa/hexagonal-core/adapters";
import { NotFoundError } from "@pagopa/hexagonal-core/domain/errors";
import Fastify from "fastify";
import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createHttpHandler } from "../httpHandlerBuilder.js";
import {
  createFastifyRequestValidator,
  emptyValidator,
} from "../validator/fastifyRequestValidator.js";

describe("createHttpHandler", () => {
  it.each([200, 201, 202] as const)(
    "emits success code %i with the formatted body",
    async (code) => {
      const app = Fastify();
      const handler = createHttpHandler(
        async () => ok({ ok: true }),
        emptyValidator,
        identityFormatter,
        { successCode: code }
      );
      app.get("/x", handler);

      const res = await app.inject({ method: "GET", url: "/x" });

      expect(res.statusCode).toBe(code);
      expect(res.json()).toEqual({ ok: true });

      await app.close();
    }
  );

  it("emits 204 with no body", async () => {
    const app = Fastify();
    const handler = createHttpHandler(
      async () => ok({}),
      emptyValidator,
      identityFormatter,
      { successCode: 204 }
    );
    app.get("/x", handler);

    const res = await app.inject({ method: "GET", url: "/x" });

    expect(res.statusCode).toBe(204);

    await app.close();
  });

  it("replies 400 problem+json when input validation fails", async () => {
    const app = Fastify();
    const handler = createHttpHandler(
      async () => ok({}),
      createFastifyRequestValidator(
        z.object({ query: z.object({ q: z.string() }) })
      ),
      identityFormatter
    );
    app.get("/x", handler);

    const res = await app.inject({ method: "GET", url: "/x" });

    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.json().title).toBe("Validation Error");

    await app.close();
  });

  it("maps a use-case error to its HTTP status", async () => {
    const app = Fastify();
    const handler = createHttpHandler(
      async () => err(new NotFoundError("User", "1")),
      emptyValidator,
      identityFormatter
    );
    app.get("/x", handler);

    const res = await app.inject({ method: "GET", url: "/x" });

    expect(res.statusCode).toBe(404);
    expect(res.json().title).toBe("Not Found");

    await app.close();
  });

  it("maps an output-formatter failure to 500", async () => {
    const app = Fastify();
    const handler = createHttpHandler(
      async () => ok({ id: "not-an-email" }),
      emptyValidator,
      createHttpResponseFormatter(z.object({ id: z.email() }))
    );
    app.get("/x", handler);

    const res = await app.inject({ method: "GET", url: "/x" });

    expect(res.statusCode).toBe(500);
    expect(res.json().title).toBe("Internal Server Error");

    await app.close();
  });
});
