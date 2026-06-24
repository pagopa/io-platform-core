import { NotFoundError } from "@pagopa/hexagonal-core/domain/errors";
import Fastify from "fastify";
import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createHttpHandler,
  type SuccessResponder,
} from "../httpHandlerBuilder.js";
import {
  createFastifyRequestValidator,
  emptyValidator,
} from "../validator/fastifyRequestValidator.js";

/** A success responder that mirrors the mount adapter: code + body. */
const sendBody =
  (code: number): SuccessResponder<unknown> =>
  async (output, reply) =>
    reply.code(code).send(output);

describe("createHttpHandler", () => {
  it.each([200, 201, 202] as const)(
    "delegates the success path to onSuccess with code %i",
    async (code) => {
      const app = Fastify();
      const handler = createHttpHandler(
        async () => ok({ ok: true }),
        emptyValidator,
        sendBody(code)
      );
      app.get("/x", handler);

      const res = await app.inject({ method: "GET", url: "/x" });

      expect(res.statusCode).toBe(code);
      expect(res.json()).toEqual({ ok: true });

      await app.close();
    }
  );

  it("lets onSuccess emit a body-less response", async () => {
    const app = Fastify();
    const handler = createHttpHandler(
      async () => ok({}),
      emptyValidator,
      async (_output, reply) => reply.code(204).send()
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
      sendBody(200)
    );
    app.get("/x", handler);

    const res = await app.inject({ method: "GET", url: "/x" });

    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.json().title).toBe("Validation Error");

    await app.close();
  });

  it("maps a use-case error to its HTTP status without calling onSuccess", async () => {
    const app = Fastify();
    let called = false;
    const handler = createHttpHandler(
      async () => err(new NotFoundError("User", "1")),
      emptyValidator,
      async (output, reply) => {
        called = true;
        return reply.code(200).send(output);
      }
    );
    app.get("/x", handler);

    const res = await app.inject({ method: "GET", url: "/x" });

    expect(res.statusCode).toBe(404);
    expect(res.json().title).toBe("Not Found");
    expect(called).toBe(false);

    await app.close();
  });
});
