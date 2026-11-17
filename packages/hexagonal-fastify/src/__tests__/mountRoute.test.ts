import {
  type DefaultSuccessOutput,
  defineRoute,
  type EmptyHttpMiddlewareContext,
  type HttpRequestMiddleware,
  ProblemJson,
  type SuccessResponseFromMap,
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

  it("applies error responder config from the top-level mount", async () => {
    const app = Fastify();
    mountFastifyRoute(
      app,
      {
        contract: getUserContract,
        inputMapper: (req) => ({ id: req.path.id }),
        useCase: async (input: { id: string }) =>
          err(new NotFoundError("User", input.id)),
      },
      { typeBaseUrl: "https://errors.example/" },
    );

    const res = await app.inject({ method: "GET", url: "/users/999" });

    expect(res.statusCode).toBe(404);
    expect(res.json().type).toBe("https://errors.example/not-found");

    await app.close();
  });

  it("applies error responder config to request validation errors", async () => {
    const app = Fastify();
    mountFastifyRoute(
      app,
      {
        contract: defineRoute({
          method: "get",
          path: "/validated-users/{id}",
          request: { path: z.object({ id: z.uuid() }) },
          response: { 200: UserSchema, 400: ProblemJson },
        }),
        inputMapper: (req) => ({ id: req.path.id }),
        useCase: async (input: { id: string }) =>
          ok({ id: input.id, name: "Alice" }),
      },
      { typeBaseUrl: "https://errors.example/" },
    );

    const res = await app.inject({
      method: "GET",
      url: "/validated-users/not-a-uuid",
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().type).toBe("https://errors.example/validation-error");

    await app.close();
  });

  it("applies the output mapper before encoding the success body", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: getUserContract,
      inputMapper: (req) => ({ id: req.path.id }),
      outputMapper: (out: { userId: string }) => ({
        body: { id: out.userId, name: "Alice" },
        status: 200,
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
      outputMapper: (out: { target: string }) => ({
        headers: { location: out.target },
        status: 302,
      }),
      useCase: async (input: { id: string }) =>
        ok({ target: `https://example.com/${input.id}` }),
    });

    const res = await app.inject({ method: "GET", url: "/go/42" });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("https://example.com/42");

    await app.close();
  });

  it("accepts a declared numeric Location input and sends its decoded string", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/numeric-location",
        request: {},
        response: {
          302: {
            description: "Moved",
            headers: z.object({
              Location: z
                .number()
                .int()
                .transform((id) => `/tasks/${id}`)
                .pipe(z.string().min(1)),
            }),
            redirect: true,
          },
        },
      }),
      inputMapper: () => ({}),
      outputMapper: (id) => ({ headers: { Location: id }, status: 302 }),
      useCase: async () => ok(42),
    });
    const response = await app.inject({ url: "/numeric-location" });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/tasks/42");
    expect(response.body).toBe("");
    await app.close();
  });

  it("rejects decoded Location values that are empty or not strings", async () => {
    const app = Fastify();
    for (const [path, schema] of [
      ["/empty-wire-location", z.string().transform(() => "")],
      ["/non-string-wire-location", z.string().transform(() => 42)],
    ] as const) {
      mountFastifyRoute(app, {
        contract: defineRoute({
          method: "get",
          path,
          request: {},
          response: {
            302: {
              description: "Moved",
              headers: z.object({ Location: schema }),
              redirect: true,
            },
          },
        }),
        inputMapper: () => ({}),
        outputMapper: () => ({ headers: { Location: "input" }, status: 302 }),
        useCase: async () => ok({}),
      });
    }
    for (const path of ["/empty-wire-location", "/non-string-wire-location"]) {
      const response = await app.inject({ url: path });
      expect(response.statusCode).toBe(500);
      expect(response.headers.location).toBeUndefined();
      expect(response.headers["content-type"]).toContain(
        "application/problem+json",
      );
    }
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

  it("selects a declared success using the mapper", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/multi",
        request: {},
        response: { 200: UserSchema, 201: UserSchema },
      }),
      inputMapper: () => ({}),
      outputMapper: (body: { id: string; name: string }) => ({
        body,
        status: 201,
      }),
      useCase: async () => ok({ id: "1", name: "Alice" }),
    });
    const response = await app.inject({ method: "GET", url: "/multi" });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ id: "1", name: "Alice" });
    await app.close();
  });
});

const responses = {
  200: {
    headers: z.object({ "x-optional": z.string().optional() }),
    schema: z.object({ id: z.string() }),
  },
  202: {
    headers: z.object({
      "x-job": z.string().transform((value) => value.toUpperCase()),
    }),
    schema: z.object({
      task: z.string().transform((value) => value.toUpperCase()),
    }),
  },
  204: z.object({}),
  302: {
    description: "Moved",
    headers: z.object({ Location: z.string().min(1) }),
    redirect: true,
  },
} as const;

describe("complete success responses", () => {
  type Response = SuccessResponseFromMap<typeof responses>;
  type Assert<T extends true> = T;
  type IsNever<T> = [T] extends [never] ? true : false;
  type MultiRequiresMapper = Assert<
    IsNever<DefaultSuccessOutput<typeof responses>>
  >;
  type RequiredHeaderRequiresMapper = Assert<
    IsNever<DefaultSuccessOutput<Pick<typeof responses, 202>>>
  >;
  type OptionalHeaderAllowsMapper = Assert<
    IsNever<DefaultSuccessOutput<Pick<typeof responses, 200>>> extends false
      ? true
      : false
  >;
  type NoContentAcceptsAnything = Assert<
    unknown extends DefaultSuccessOutput<Pick<typeof responses, 204>>
      ? true
      : false
  >;
  const numericHeaders = z.object({
    Location: z.number().transform((id) => `/tasks/${id}`),
  });
  type NumericDefaultRequiresMapper = Assert<
    IsNever<
      DefaultSuccessOutput<{
        302: {
          description: "Moved";
          headers: typeof numericHeaders;
          redirect: true;
        };
      }>
    >
  >;
  type ImplicitRedirect = SuccessResponseFromMap<{
    302: { description: "Moved"; redirect: true };
  }>;
  const invalidImplicit: ImplicitRedirect = {
    // @ts-expect-error an implicit Location input must be a string
    headers: { location: 42 },
    status: 302,
  };
  const eligibility: [
    MultiRequiresMapper,
    RequiredHeaderRequiresMapper,
    OptionalHeaderAllowsMapper,
    NoContentAcceptsAnything,
    NumericDefaultRequiresMapper,
  ] = [true, true, true, true, true];
  const valid: Response = {
    body: { task: "job" },
    headers: { "x-job": "job" },
    status: 202,
  };
  // @ts-expect-error status is not declared
  const badStatus: Response = { body: { id: "1" }, status: 201 };
  const badBody: Response = {
    body: { id: "1" },
    // @ts-expect-error body must match its status
    headers: { "x-job": "job" },
    status: 202,
  };
  // @ts-expect-error required header is missing
  const missingHeader: Response = { body: { task: "job" }, status: 202 };
  const badHeader: Response = {
    body: { task: "job" },
    // @ts-expect-error header value must match the schema input
    headers: { "x-job": 1 },
    status: 202,
  };
  const extraHeader: Response = {
    body: { id: "1" },
    // @ts-expect-error undeclared header
    headers: { "x-extra": "x" },
    status: 200,
  };
  // @ts-expect-error no body for 204
  const noContentBody: Response = { body: {}, status: 204 };

  it("decodes body and headers before sending the selected status", async () => {
    expect(numericHeaders.safeParse({ Location: 42 }).success).toBe(true);
    expect([
      valid,
      badStatus,
      badBody,
      missingHeader,
      badHeader,
      extraHeader,
      noContentBody,
      invalidImplicit,
    ]).toHaveLength(8);
    expect(eligibility).toEqual([true, true, true, true, true]);
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/decoded",
        request: {},
        response: responses,
      }),
      inputMapper: () => ({}),
      outputMapper: () => valid,
      useCase: async () => ok({}),
    });
    const response = await app.inject({ method: "GET", url: "/decoded" });
    expect(response.statusCode).toBe(202);
    expect(response.headers["x-job"]).toBe("JOB");
    expect(response.json()).toEqual({ task: "JOB" });
    await app.close();
  });

  it("rejects malformed output without leaking success headers", async () => {
    const cases: unknown[] = [
      { body: { id: "1" }, status: 201 },
      { body: { task: 1 }, headers: { "x-job": "job" }, status: 202 },
      { body: { task: "job" }, headers: {}, status: 202 },
      {
        body: { task: "job" },
        headers: { extra: "no", "x-job": "job" },
        status: 202,
      },
      {
        body: { task: "job" },
        headers: { "x-job": "bad\r\nvalue" },
        status: 202,
      },
      { body: {}, status: 204 },
      { headers: { location: "" }, status: 302 },
      { body: "unexpected", headers: { location: "/ok" }, status: 302 },
    ];
    for (const [index, mapped] of cases.entries()) {
      const app = Fastify();
      mountFastifyRoute(app, {
        contract: defineRoute({
          method: "get",
          path: `/invalid-${index}`,
          request: {},
          response: responses,
        }),
        inputMapper: () => ({}),
        outputMapper: () => mapped as Response,
        useCase: async () => ok({}),
      });
      const response = await app.inject({
        method: "GET",
        url: `/invalid-${index}`,
      });
      expect(response.statusCode).toBe(500);
      expect(response.headers["x-job"]).toBeUndefined();
      expect(response.headers.location).toBeUndefined();
      expect(response.headers["content-type"]).toContain(
        "application/problem+json",
      );
      await app.close();
    }
  });
});

describe("asynchronous response headers", () => {
  it("decodes async header pipes and rejects invalid output before sending headers", async () => {
    const app = Fastify();
    const contract = defineRoute({
      method: "get",
      path: "/async-header",
      request: {},
      response: {
        200: {
          headers: z.object({
            "x-result": z
              .string()
              .transform(async (value) => value.toUpperCase())
              .pipe(z.string().regex(/^OK$/)),
          }),
          schema: z.string(),
        },
      },
    });
    mountFastifyRoute(app, {
      contract,
      inputMapper: () => ({}),
      outputMapper: (value) => ({
        body: "body",
        headers: { "x-result": value },
        status: 200,
      }),
      useCase: async () => ok("ok"),
    });
    const response = await app.inject({ method: "GET", url: "/async-header" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["x-result"]).toBe("OK");
    await app.close();

    const invalid = Fastify();
    mountFastifyRoute(invalid, {
      contract,
      inputMapper: () => ({}),
      outputMapper: (value) => ({
        body: "body",
        headers: { "x-result": value },
        status: 200,
      }),
      useCase: async () => ok("bad"),
    });
    const rejected = await invalid.inject({
      method: "GET",
      url: "/async-header",
    });
    expect(rejected.statusCode).toBe(500);
    expect(rejected.headers["x-result"]).toBeUndefined();
    await invalid.close();
  });

  it("sends the decoded asynchronous redirect Location", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/async-redirect",
        request: {},
        response: {
          302: {
            description: "Moved",
            headers: z.object({
              Location: z
                .string()
                .transform(async (value) => `/tasks/${value}`)
                .pipe(z.string().regex(/^\/tasks\//)),
            }),
            redirect: true,
          },
        },
      }),
      inputMapper: () => ({}),
      useCase: async () => ok("42"),
    });
    const response = await app.inject({
      method: "GET",
      url: "/async-redirect",
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/tasks/42");
    await app.close();
  });
});

describe("shared transformed response value objects", () => {
  it("decodes the same asynchronous optional value in the body and header", async () => {
    const value = z
      .string()
      .optional()
      .transform(async (input) => input?.toLowerCase())
      .pipe(
        z
          .string()
          .regex(/^[a-z]+$/)
          .optional(),
      )
      .meta({ id: "SharedAsyncValue" });
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/shared-async",
        request: {},
        response: {
          200: {
            headers: z.object({ "x-value": value }),
            schema: z.object({ value }),
          },
        },
      }),
      inputMapper: () => ({}),
      outputMapper: () => ({
        body: { value: "ABC" },
        headers: { "x-value": "ABC" },
        status: 200,
      }),
      useCase: async () => ok({}),
    });
    const response = await app.inject({ method: "GET", url: "/shared-async" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ value: "abc" });
    expect(response.headers["x-value"]).toBe("abc");
    await app.close();
  });
});

describe("response header and serialization regressions", () => {
  it("rejects runtime error header declarations at mount", () => {
    const app = Fastify();
    const response = {
      200: UserSchema,
      404: {
        headers: z.object({ "x-error": z.string() }),
        schema: ProblemJson,
      },
    };
    expect(() =>
      mountFastifyRoute(app, {
        contract: {
          method: "get",
          path: "/invalid-error",
          request: {},
          response: response as { 200: typeof UserSchema },
        },
        inputMapper: () => ({}),
        useCase: async () => ok({ id: "1", name: "A" }),
      }),
    ).toThrow(/404 cannot declare error headers/);
  });

  it("keeps implicit Location separate from strict custom headers", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/strict-redirect",
        request: {},
        response: {
          302: {
            description: "Moved",
            headers: z.strictObject({ "x-optional": z.string().optional() }),
            redirect: true,
          },
        },
      }),
      inputMapper: () => ({}),
      useCase: async () => ok("/target"),
    });
    const response = await app.inject({
      method: "GET",
      url: "/strict-redirect",
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/target");
    await app.close();
  });

  it("sends validated repeated headers and rejects invalid array elements", async () => {
    const app = Fastify();
    const contract = defineRoute({
      method: "get",
      path: "/cookies",
      request: {},
      response: {
        200: {
          headers: z.object({ "set-cookie": z.array(z.string()) }),
          schema: z.string(),
        },
      },
    });
    mountFastifyRoute(app, {
      contract,
      inputMapper: () => ({}),
      outputMapper: () => ({
        body: "ok",
        headers: { "set-cookie": ["a=1", "b=2"] },
        status: 200,
      }),
      useCase: async () => ok({}),
    });
    const response = await app.inject({ method: "GET", url: "/cookies" });
    expect(response.statusCode).toBe(200);
    expect(response.headers["set-cookie"]).toEqual(["a=1", "b=2"]);
    await app.close();

    const invalid = Fastify();
    mountFastifyRoute(invalid, {
      contract,
      inputMapper: () => ({}),
      outputMapper: () => ({
        body: "ok",
        headers: { "set-cookie": ["a=1", "bad\r\nvalue"] },
        status: 200,
      }),
      useCase: async () => ok({}),
    });
    const rejected = await invalid.inject({ method: "GET", url: "/cookies" });
    expect(rejected.statusCode).toBe(500);
    expect(rejected.headers["set-cookie"]).toBeUndefined();
    await invalid.close();
  });

  it("rejects optional undeclared keys in actual mount inference", () => {
    const app = Fastify();
    const contract = defineRoute({
      method: "get",
      path: "/types",
      request: {},
      response: { 200: responses[200] },
    });
    const mapper = (): {
      body: { id: string };
      headers?: { extra?: string; "x-optional"?: string };
      status: 200;
    } => ({ body: { id: "1" }, status: 200 });
    const invalidMount = () =>
      mountFastifyRoute(app, {
        contract,
        inputMapper: () => ({}),
        // @ts-expect-error optional extra keys are not declared
        outputMapper: mapper,
        useCase: async () => ok({ id: "1" }),
      });
    expect(invalidMount).toBeDefined();
  });

  it("returns RFC 7807 without success headers on serialization failure", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/bigint",
        request: {},
        response: {
          200: {
            headers: z.object({ "x-success": z.string() }),
            schema: z.object({ value: z.bigint() }),
          },
        },
      }),
      inputMapper: () => ({}),
      outputMapper: () => ({
        body: { value: 1n },
        headers: { "x-success": "leak" },
        status: 200,
      }),
      useCase: async () => ok({}),
    });
    const response = await app.inject({ method: "GET", url: "/bigint" });
    expect(response.statusCode).toBe(500);
    expect(response.headers["x-success"]).toBeUndefined();
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(response.json()).toMatchObject({ status: 500 });
    await app.close();
  });

  it("clears success headers when send throws synchronously", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/bad-content-type",
        request: {},
        response: {
          200: {
            headers: z.object({
              "content-type": z.number(),
              "x-success": z.string(),
            }),
            schema: z.string(),
          },
        },
      }),
      inputMapper: () => ({}),
      outputMapper: () => ({
        body: "ok",
        headers: { "content-type": 123, "x-success": "leak" },
        status: 200,
      }),
      useCase: async () => ok({}),
    });
    const response = await app.inject({
      method: "GET",
      url: "/bad-content-type",
    });
    expect(response.statusCode).toBe(500);
    expect(response.headers["x-success"]).toBeUndefined();
    expect(response.headers["content-type"]).toContain(
      "application/problem+json",
    );
    expect(response.json()).toMatchObject({ status: 500 });
    await app.close();
  });
});

describe("post-commit hook failures", () => {
  it("clears committed headers for failing hooks without affecting concurrent replies", async () => {
    for (const hook of ["preSerialization", "onSend"] as const) {
      const app = Fastify();
      app.addHook(hook, async (request, reply, payload) => {
        if (request.url.includes("fail") && reply.statusCode < 400) {
          throw Object.assign(new Error("hook failure"), { statusCode: 418 });
        }
        return payload;
      });
      mountFastifyRoute(app, {
        contract: defineRoute({
          method: "get",
          path: "/hook",
          request: {},
          response: {
            200: {
              headers: z.object({ "x-success": z.string() }),
              schema: z.object({ value: z.string() }),
            },
          },
        }),
        inputMapper: () => ({}),
        outputMapper: () => ({
          body: { value: "ok" },
          headers: { "x-success": "present" },
          status: 200,
        }),
        useCase: async () => ok({}),
      });
      const [failure, success] = await Promise.all([
        app.inject({ url: "/hook?fail" }),
        app.inject({ url: "/hook" }),
      ]);
      expect(failure.statusCode).toBe(418);
      expect(failure.headers["x-success"]).toBeUndefined();
      expect(failure.json()).toMatchObject({
        message: "hook failure",
        statusCode: 418,
      });
      expect(success.statusCode).toBe(200);
      expect(success.headers["x-success"]).toBe("present");
      await app.close();
    }
    const app = Fastify();
    app.addHook("onSend", async (_request, reply, payload) => {
      if (reply.statusCode === 302)
        throw Object.assign(new Error("redirect hook failure"), {
          statusCode: 418,
        });
      return payload;
    });
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/redirect-hook",
        request: {},
        response: {
          302: {
            description: "Moved",
            headers: z.object({ "x-success": z.string() }),
            redirect: true,
          },
        },
      }),
      inputMapper: () => ({}),
      outputMapper: () => ({
        headers: { location: "/target", "x-success": "present" },
        status: 302,
      }),
      useCase: async () => ok({}),
    });
    const failure = await app.inject({ url: "/redirect-hook" });
    expect(failure.statusCode).toBe(418);
    expect(failure.headers.location).toBeUndefined();
    expect(failure.headers["x-success"]).toBeUndefined();
    await app.close();
  });
});

describe("complete success response defaults", () => {
  it("accepts case-insensitive Location and serializes its transformed value", async () => {
    const app = Fastify();
    const contract = defineRoute({
      method: "get",
      path: "/redirect-transform",
      request: {},
      response: {
        302: {
          description: "Moved",
          headers: z.object({
            Location: z.string().transform((value) => `/prefix${value}`),
          }),
          redirect: true,
        },
      },
    });
    mountFastifyRoute(app, {
      contract,
      inputMapper: () => ({}),
      useCase: async () => ok("/target"),
    });
    const response = await app.inject({
      method: "GET",
      url: "/redirect-transform",
    });
    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/prefix/target");
    expect(response.body).toBe("");
    await app.close();
  });
});

describe("redirect output validation", () => {
  it("rejects empty or non-string default output before transforming Location", async () => {
    const app = Fastify();
    for (const [path, output] of [
      ["/empty-default", ""],
      ["/non-string-default", 42 as unknown as string],
      ["/invalid-default", "bad!"],
      ["/valid-default", "42"],
    ] as const) {
      mountFastifyRoute(app, {
        contract: defineRoute({
          method: "get",
          path,
          request: {},
          response: {
            302: {
              description: "Moved",
              headers: z.object({
                Location: z
                  .string()
                  .regex(/^[a-z0-9]*$/)
                  .transform((value) => `/tasks/${value}`)
                  .pipe(z.string().min(1)),
              }),
              redirect: true,
            },
          },
        }),
        inputMapper: () => ({}),
        useCase: async () => ok(output),
      });
    }
    for (const path of [
      "/empty-default",
      "/non-string-default",
      "/invalid-default",
    ]) {
      const response = await app.inject({ url: path });
      expect(response.statusCode).toBe(500);
      expect(response.headers.location).toBeUndefined();
      expect(response.headers["content-type"]).toContain(
        "application/problem+json",
      );
      expect(response.json()).toMatchObject({
        status: 500,
        title: "Internal Server Error",
      });
    }
    const valid = await app.inject({ url: "/valid-default" });
    expect(valid.statusCode).toBe(302);
    expect(valid.headers.location).toBe("/tasks/42");
    await app.close();
  });

  it("rejects duplicate declared and mapped header names case-insensitively", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/duplicate-declaration",
        request: {},
        response: {
          200: {
            headers: z.object({
              "X-Test": z.string().optional(),
              "x-test": z.string().optional(),
            }),
            schema: z.string(),
          },
        },
      }),
      inputMapper: () => ({}),
      useCase: async () => ok("ok"),
    });
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/duplicate-values",
        request: {},
        response: {
          302: {
            description: "Moved",
            headers: z.object({ Location: z.string() }),
            redirect: true,
          },
        },
      }),
      inputMapper: () => ({}),
      outputMapper: () => ({
        headers: { Location: "/one", location: "/two" } as { Location: string },
        status: 302,
      }),
      useCase: async () => ok({}),
    });
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/mixed-case-location",
        request: {},
        response: {
          302: {
            description: "Moved",
            headers: z.object({
              Location: z.string().transform((value) => `/tasks/${value}`),
            }),
            redirect: true,
          },
        },
      }),
      inputMapper: () => ({}),
      outputMapper: () => ({
        headers: { lOcAtIoN: "42" } as unknown as { Location: string },
        status: 302,
      }),
      useCase: async () => ok({}),
    });
    for (const path of ["/duplicate-declaration", "/duplicate-values"]) {
      const response = await app.inject({ url: path });
      expect(response.statusCode).toBe(500);
      expect(response.headers.location).toBeUndefined();
      expect(response.headers["x-test"]).toBeUndefined();
      expect(response.headers["content-type"]).toContain(
        "application/problem+json",
      );
    }
    const mixedCase = await app.inject({ url: "/mixed-case-location" });
    expect(mixedCase.statusCode).toBe(302);
    expect(mixedCase.headers.location).toBe("/tasks/42");
    await app.close();
  });
});

describe("remaining success response defaults", () => {
  it("rejects routes without a declared success at mount", () => {
    const app = Fastify();
    expect(() =>
      mountFastifyRoute(app, {
        contract: defineRoute({
          method: "get",
          path: "/none",
          request: {},
          response: { 400: ProblemJson },
        }),
        inputMapper: () => ({}),
        useCase: async () => ok({}),
      }),
    ).toThrow(/no success entry/);
  });

  it("allows optional headers and ignores arbitrary output for 204", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/optional",
        request: {},
        response: { 200: responses[200] },
      }),
      inputMapper: () => ({}),
      useCase: async () => ok({ id: "1" }),
    });
    mountFastifyRoute(app, {
      contract: defineRoute({
        method: "get",
        path: "/empty",
        request: {},
        response: { 204: responses[204] },
      }),
      inputMapper: () => ({}),
      useCase: async () => ok({ ignored: "value" }),
    });
    const body = await app.inject({ method: "GET", url: "/optional" });
    const empty = await app.inject({ method: "GET", url: "/empty" });
    expect(body.json()).toEqual({ id: "1" });
    expect(body.headers["x-optional"]).toBeUndefined();
    expect(empty.statusCode).toBe(204);
    expect(empty.body).toBe("");
    await app.close();
  });

  it("requires a mapper for multiple successes and required custom headers", () => {
    const app = Fastify();
    const sameBodies = defineRoute({
      method: "get",
      path: "/same",
      request: {},
      response: { 200: UserSchema, 201: UserSchema },
    });
    const singleBody = defineRoute({
      method: "get",
      path: "/single",
      request: {},
      response: { 200: UserSchema },
    });
    const requiredHeader = defineRoute({
      method: "get",
      path: "/required",
      request: {},
      response: { 202: responses[202] },
    });
    const invalidMounts = () => {
      // @ts-expect-error identical bodies still require an explicit mapper
      mountFastifyRoute(app, {
        contract: sameBodies,
        inputMapper: () => ({}),
        useCase: async () => ok({ id: "1", name: "A" }),
      });
      // @ts-expect-error required custom headers cannot be supplied by the default
      mountFastifyRoute(app, {
        contract: requiredHeader,
        inputMapper: () => ({}),
        useCase: async () => ok({ task: "job" }),
      });
      // @ts-expect-error the default body must match the schema input
      mountFastifyRoute(app, {
        contract: singleBody,
        inputMapper: () => ({}),
        useCase: async () => ok(123),
      });
    };
    expect(invalidMounts).toThrow(/multiple success entries/);
  });
});

describe("redirect status category", () => {
  it("mounts quoted statuses with exact mapper and default types", async () => {
    const app = Fastify();
    mountFastifyRoute(app, {
      contract: {
        method: "get",
        path: "/quoted-default",
        request: {},
        response: { "200": z.string() },
      },
      inputMapper: () => ({}),
      useCase: async () => ok("default"),
    });
    mountFastifyRoute(app, {
      contract: {
        method: "get",
        path: "/quoted-multi",
        request: {},
        response: {
          "200": z.string(),
          "302": { description: "Moved", redirect: true },
        },
      },
      inputMapper: () => ({}),
      outputMapper: () => ({ headers: { location: "/target" }, status: 302 }),
      useCase: async () => ok({}),
    });
    const invalid = () =>
      mountFastifyRoute(app, {
        // @ts-expect-error a quoted 302 cannot carry a body
        contract: {
          method: "get",
          path: "/quoted-invalid",
          request: {},
          response: { "200": z.string(), "302": z.string() },
        },
        inputMapper: () => ({}),
        outputMapper: () => ({ body: "bad", status: 200 }),
        useCase: async () => ok({}),
      });
    expect(invalid).toThrow(/redirect status category/);
    const noncanonical = () =>
      mountFastifyRoute(app, {
        // @ts-expect-error a noncanonical numeric key cannot be a status
        contract: {
          method: "get",
          path: "/noncanonical-invalid",
          request: {},
          response: { 200: z.string(), "0302": z.string() },
        },
        inputMapper: () => ({}),
        outputMapper: () => ({ body: "bad", status: 200 }),
        useCase: async () => ok({}),
      });
    expect(noncanonical).toThrow(/redirect status category/);
    const single = await app.inject({ url: "/quoted-default" });
    const multi = await app.inject({ url: "/quoted-multi" });
    expect(single.statusCode).toBe(200);
    expect(single.body).toBe("default");
    expect(multi.statusCode).toBe(302);
    expect(multi.headers.location).toBe("/target");
    await app.close();
  });

  it("rejects mismatches at definition and mount, even when types are bypassed", () => {
    const bodyRedirect = { 200: z.string(), 302: z.string() };
    const redirectBody = {
      200: { description: "Moved", redirect: true as const },
    };
    const unsupportedRedirect = {
      304: { description: "Moved", redirect: true as const },
    };
    const invalidDefinitions = [
      () =>
        // @ts-expect-error a 302 must be a redirect entry
        defineRoute({
          method: "get",
          path: "/a",
          request: {},
          response: bodyRedirect,
        }),
      () =>
        // @ts-expect-error a 200 cannot be a redirect entry
        defineRoute({
          method: "get",
          path: "/b",
          request: {},
          response: redirectBody,
        }),
      () =>
        // @ts-expect-error an unsupported redirect status cannot be a redirect entry
        defineRoute({
          method: "get",
          path: "/c",
          request: {},
          response: unsupportedRedirect,
        }),
    ];
    for (const invalid of invalidDefinitions)
      expect(invalid).toThrow(/redirect status category/);
    const app = Fastify();
    const invalidMount = () =>
      mountFastifyRoute(app, {
        // @ts-expect-error mount also rejects bypassing defineRoute
        contract: {
          method: "get",
          path: "/invalid",
          request: {},
          response: bodyRedirect,
        },
        inputMapper: () => ({}),
        outputMapper: () => ({ body: "ok", status: 200 as const }),
        useCase: async () => ok({}),
      });
    expect(invalidMount).toThrow(/redirect status category/);
    for (const response of [bodyRedirect, redirectBody, unsupportedRedirect]) {
      expect(() =>
        mountFastifyRoute(app, {
          contract: {
            method: "get",
            path: "/bypass",
            request: {},
            response: response as unknown as { 200: typeof UserSchema },
          },
          inputMapper: () => ({}),
          useCase: async () => ok({ id: "1", name: "A" }),
        }),
      ).toThrow(/redirect status category/);
    }
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
