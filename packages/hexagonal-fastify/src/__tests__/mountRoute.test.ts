import { defineRoute, ProblemJson } from "@pagopa/hexagonal-core/adapters";
import { NotFoundError } from "@pagopa/hexagonal-core/domain/errors";
import Fastify from "fastify";
import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { mountFastifyRoute } from "../mountRoute.js";

const UserSchema = z.object({ id: z.string(), name: z.string() });

const getUserContract = defineRoute({
  method: "get",
  operationId: "getUser",
  path: "/users/{id}",
  request: { path: z.object({ id: z.string() }) },
  response: { 200: UserSchema, 404: ProblemJson },
});

const mountGetUser = (app: ReturnType<typeof Fastify>): void => {
  mountFastifyRoute(app, {
    contract: getUserContract,
    inputMapper: (req) => ({ id: req.path.id }),
    useCase: async (input: { id: string }) =>
      input.id === "1"
        ? ok({ id: "1", name: "Alice" })
        : err(new NotFoundError("User", input.id)),
  });
};

describe("mountFastifyRoute", () => {
  it("mounts the route and returns the formatted success body", async () => {
    const app = Fastify();
    mountGetUser(app);

    const res = await app.inject({ method: "GET", url: "/users/1" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: "1", name: "Alice" });

    await app.close();
  });

  it("converts OpenAPI path params and maps domain errors to problem+json", async () => {
    const app = Fastify();
    mountGetUser(app);

    const res = await app.inject({ method: "GET", url: "/users/999" });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.json().title).toBe("Not Found");

    await app.close();
  });

  it("applies the output mapper before encoding the success body", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: getUserContract,
      inputMapper: (req) => ({ id: req.path.id }),
      outputMapper: (out: { userId: string }) => ({
        id: out.userId,
        name: "Alice",
      }),
      useCase: async (input: { id: string }) =>
        input.id === "1"
          ? ok({ userId: "1" })
          : err(new NotFoundError("User", input.id)),
    });

    const res = await app.inject({ method: "GET", url: "/users/1" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: "1", name: "Alice" });

    await app.close();
  });

  it("maps an output that fails its own schema to 500", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        operationId: "getEmail",
        path: "/email",
        request: {},
        response: { 200: z.object({ id: z.email() }) },
      }),
      inputMapper: () => ({}),
      useCase: async () => ok({ id: "not-an-email" }),
    });

    const res = await app.inject({ method: "GET", url: "/email" });

    expect(res.statusCode).toBe(500);
    expect(res.json().title).toBe("Internal Server Error");

    await app.close();
  });

  it("treats a 301/302 redirect as a body-less success", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        operationId: "legacyRedirect",
        path: "/legacy",
        request: {},
        response: {
          302: { description: "Moved", redirect: true },
        },
      }),
      inputMapper: () => ({}),
      useCase: async () => ok(undefined),
    });

    const res = await app.inject({ method: "GET", url: "/legacy" });

    expect(res.statusCode).toBe(302);
    expect(res.body).toBe("");

    await app.close();
  });

  it("strips the body for a 204 success", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "delete",
        operationId: "deleteUser",
        path: "/users/{id}",
        request: { path: z.object({ id: z.string() }) },
        response: { 204: z.object({}) },
      }),
      inputMapper: (req) => ({ id: req.path.id }),
      useCase: async () => ok({}),
    });

    const res = await app.inject({ method: "DELETE", url: "/users/1" });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");

    await app.close();
  });

  it("throws at mount time when the contract declares multiple success responses", () => {
    const app = Fastify();

    expect(() =>
      mountFastifyRoute(app, {
        contract: defineRoute({
          method: "get",
          operationId: "multiSuccess",
          path: "/multi",
          request: {},
          response: { 200: UserSchema, 201: UserSchema },
        }),
        inputMapper: () => ({}),
        useCase: async () => ok({ id: "1", name: "Alice" }),
      }),
    ).toThrow(/multiple success entries/);
  });
});
