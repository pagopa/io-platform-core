import {
  defineRoute,
  type EmptyHttpMiddlewareContext,
  type HttpRequestMiddleware,
  ProblemJson,
} from "@pagopa/hexagonal-core/adapters";
import {
  AuthenticationError,
  NotFoundError,
} from "@pagopa/hexagonal-core/domain/errors";
import Fastify from "fastify";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { mountFastifyRoute } from "../mountRoute.js";

const UserSchema = z.object({ id: z.string(), name: z.string() });

interface ActorContext {
  actorId: string;
}

interface TenantContext {
  tenantId: string;
}

const authenticateRequest: HttpRequestMiddleware<
  EmptyHttpMiddlewareContext,
  ActorContext,
  AuthenticationError
> = async ({ payload }) => {
  const headers = payload.headers as { authorization?: string };
  return headers.authorization
    ? ok({ actorId: "actor-1" })
    : err(new AuthenticationError());
};

const resolveTenant: HttpRequestMiddleware<
  Pick<ActorContext, "actorId">,
  TenantContext,
  never
> = async ({ context }) =>
  ok({ tenantId: context.actorId.replace("actor", "tenant") });

const rejectRequest: HttpRequestMiddleware<
  EmptyHttpMiddlewareContext,
  EmptyHttpMiddlewareContext,
  AuthenticationError
> = async () => err(new AuthenticationError());

const getUserContract = defineRoute({
  method: "get",
  path: "/users/{id}",
  request: { path: z.object({ id: z.string() }) },
  response: { 200: UserSchema, 400: ProblemJson, 404: ProblemJson },
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
});

describe("mountFastifyRoute middleware", () => {
  it("runs middleware before validation and passes accumulated context to the mapper", async () => {
    const app = Fastify();
    const calls: string[] = [];
    const authenticate = vi.fn<typeof authenticateRequest>(async (input) => {
      calls.push("authenticate");
      return authenticateRequest(input);
    });
    const tenant = vi.fn<typeof resolveTenant>(async (input) => {
      calls.push("tenant");
      return resolveTenant(input);
    });

    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "post",
        path: "/users/{id}",
        request: {
          body: z.object({ name: z.string() }),
          headers: z.object({ authorization: z.string() }),
          path: z.object({ id: z.string().uuid() }),
          query: z.object({ source: z.string() }),
        },
        response: {
          200: UserSchema,
          400: ProblemJson,
          401: ProblemJson,
        },
      }),
      inputMapper: (request, context) => {
        calls.push("map");
        return {
          actorId: context.actorId,
          id: request.path.id,
          name: request.body.name,
          tenantId: context.tenantId,
        };
      },
      middlewares: [authenticate, tenant],
      useCase: async (input) => {
        calls.push("use-case");
        return ok({ id: input.id, name: `${input.name}:${input.tenantId}` });
      },
    });

    const response = await app.inject({
      headers: { authorization: "Bearer token" },
      method: "POST",
      payload: { name: "Alice" },
      url: "/users/123e4567-e89b-12d3-a456-426614174000?source=test",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Alice:tenant-1",
    });
    expect(calls).toEqual(["authenticate", "tenant", "map", "use-case"]);
    expect(authenticate.mock.calls[0]?.[0].payload.body).toEqual({
      name: "Alice",
    });
    expect(authenticate.mock.calls[0]?.[0].payload.path).toEqual({
      id: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(authenticate.mock.calls[0]?.[0].payload.query).toEqual({
      source: "test",
    });
    expect(tenant.mock.calls[0]?.[0].context.actorId).toBe("actor-1");

    await app.close();
  });

  it("fast-fails middleware before request validation", async () => {
    const app = Fastify();
    const useCase = vi.fn(async () => ok({ id: "1", name: "never" }));

    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/protected/{id}",
        request: { path: z.object({ id: z.string().uuid() }) },
        response: { 200: UserSchema, 400: ProblemJson, 401: ProblemJson },
      }),
      inputMapper: (request) => ({ id: request.path.id }),
      middlewares: [rejectRequest],
      useCase,
    });

    const response = await app.inject({
      method: "GET",
      url: "/protected/not-a-uuid",
    });

    expect(response.statusCode).toBe(401);
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(response.json().title).toBe("Unauthorized");
    expect(useCase).not.toHaveBeenCalled();

    await app.close();
  });

  it("falls back to 500 when a declared middleware error schema rejects the payload", async () => {
    const app = Fastify();

    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/invalid-error-contract",
        request: {},
        response: {
          200: UserSchema,
          401: ProblemJson.refine(() => false),
        },
      }),
      inputMapper: () => ({}),
      middlewares: [rejectRequest],
      useCase: async () => ok({ id: "1", name: "never" }),
    });

    const response = await app.inject({
      method: "GET",
      url: "/invalid-error-contract",
    });

    expect(response.statusCode).toBe(500);
    expect(response.json().title).toBe("Internal Server Error");

    await app.close();
  });
});

describe("mountFastifyRoute middleware type contract", () => {
  it("rejects a tuple whose required context is unavailable", () => {
    const app = Fastify();

    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/invalid-middleware-order",
        request: {},
        response: { 200: UserSchema },
      }),
      inputMapper: (_request, context) => ({ tenantId: context.tenantId }),
      // @ts-expect-error - resolveTenant requires actorId from a prior stage
      middlewares: [resolveTenant],
      useCase: async () => ok({ id: "1", name: "never" }),
    });

    expect(
      app.hasRoute({ method: "GET", url: "/invalid-middleware-order" }),
    ).toBe(true);
  });

  it("requires every middleware error status in the route contract", () => {
    const app = Fastify();

    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/missing-middleware-error",
        request: {},
        response: { 200: UserSchema },
      }),
      inputMapper: () => ({}),
      middlewares: [authenticateRequest],
      // @ts-expect-error - AuthenticationError requires a 401 response entry
      useCase: async () => ok({ id: "1", name: "never" }),
    });

    expect(
      app.hasRoute({ method: "GET", url: "/missing-middleware-error" }),
    ).toBe(true);
  });
});

describe("mountFastifyRoute redirects", () => {
  it("treats a 301/302 redirect as a body-less success with a Location header", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/legacy",
        request: {},
        response: {
          302: { description: "Moved", redirect: true },
        },
      }),
      inputMapper: () => ({}),
      useCase: async () => ok("https://example.com/new"),
    });

    const res = await app.inject({ method: "GET", url: "/legacy" });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("https://example.com/new");
    expect(res.body).toBe("");

    await app.close();
  });

  it("treats 303/307/308 redirects as a body-less success with a Location header", async () => {
    const app303 = Fastify();
    mountFastifyRoute(app303, {
      contract: defineRoute({
        method: "get",
        path: "/legacy",
        request: {},
        response: { 303: { description: "Redirect", redirect: true } },
      }),
      inputMapper: () => ({}),
      useCase: async () => ok("https://example.com/new"),
    });

    const app307 = Fastify();
    mountFastifyRoute(app307, {
      contract: defineRoute({
        method: "get",
        path: "/legacy",
        request: {},
        response: { 307: { description: "Redirect", redirect: true } },
      }),
      inputMapper: () => ({}),
      useCase: async () => ok("https://example.com/new"),
    });

    const app308 = Fastify();
    mountFastifyRoute(app308, {
      contract: defineRoute({
        method: "get",
        path: "/legacy",
        request: {},
        response: { 308: { description: "Redirect", redirect: true } },
      }),
      inputMapper: () => ({}),
      useCase: async () => ok("https://example.com/new"),
    });

    for (const [app, status] of [
      [app303, 303],
      [app307, 307],
      [app308, 308],
    ] as const) {
      const res = await app.inject({ method: "GET", url: "/legacy" });

      expect(res.statusCode).toBe(status);
      expect(res.headers.location).toBe("https://example.com/new");
      expect(res.body).toBe("");

      await app.close();
    }
  });

  it("maps the redirect Location through the output mapper", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/go/{id}",
        request: { path: z.object({ id: z.string() }) },
        response: {
          302: { description: "Moved", redirect: true },
          400: ProblemJson,
        },
      }),
      inputMapper: (req) => ({ id: req.path.id }),
      outputMapper: (out: { target: string }) => out.target,
      useCase: async (input: { id: string }) =>
        ok({ target: `https://example.com/${input.id}` }),
    });

    const res = await app.inject({ method: "GET", url: "/go/42" });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("https://example.com/42");

    await app.close();
  });

  it("maps a missing/empty redirect Location to 500", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/broken",
        request: {},
        response: {
          302: { description: "Moved", redirect: true },
        },
      }),
      inputMapper: () => ({}),
      useCase: async () => ok(""),
    });

    const res = await app.inject({ method: "GET", url: "/broken" });

    expect(res.statusCode).toBe(500);
    expect(res.json().title).toBe("Internal Server Error");

    await app.close();
  });
});

describe("mountFastifyRoute success", () => {
  it("strips the body for a 204 success", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "delete",
        path: "/users/{id}",
        request: { path: z.object({ id: z.string() }) },
        response: { 204: z.object({}), 400: ProblemJson },
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

describe("mountFastifyRoute validation coverage", () => {
  it("rejects at compile time a validating contract that omits the 400 response", async () => {
    const app = Fastify();

    mountFastifyRoute(app, {
      // @ts-expect-error - request.path validates input but response has no 400 entry
      contract: defineRoute({
        method: "get",
        path: "/things/{id}",
        request: { path: z.object({ id: z.string() }) },
        response: { 200: UserSchema },
      }),
      inputMapper: (req) => ({ id: req.path.id }),
      useCase: async (input: { id: string }) =>
        ok({ id: input.id, name: "Alice" }),
    });

    // The guard is purely a compile-time (type) check: the suppressed error
    // above does not affect runtime behavior, so the route still mounts.
    const res = await app.inject({ method: "GET", url: "/things/1" });

    expect(res.statusCode).toBe(200);

    await app.close();
  });

  it("returns 400 at runtime when the request fails a declared validation schema", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/things/{id}",
        request: { path: z.object({ id: z.string().uuid() }) },
        response: { 200: UserSchema, 400: ProblemJson },
      }),
      inputMapper: (req) => ({ id: req.path.id }),
      useCase: async (input: { id: string }) =>
        ok({ id: input.id, name: "Alice" }),
    });

    const res = await app.inject({ method: "GET", url: "/things/not-a-uuid" });

    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");

    await app.close();
  });
});
