import { err, ok } from "neverthrow";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import type { InputValidator } from "../../../domain/ports/inbound/index.js";
import type { HttpRequestPayload } from "../../validator/httpInputStandardSchemaValidator.js";
import type {
  EmptyHttpMiddlewareContext,
  EnsureHttpMiddlewareSequence,
  HttpMiddlewareContext,
  HttpMiddlewareErrors,
  HttpMiddlewareSequence,
  HttpRequestMiddleware,
} from "../index.js";

import { AuthenticationError } from "../../../domain/errors/index.js";
import {
  executeHttpMiddlewareSequence,
  executeHttpRequestPipeline,
} from "../index.js";

interface ActorContext {
  actor: { id: string };
}

interface TenantContext {
  tenantId: string;
}

const addActor: HttpRequestMiddleware<
  EmptyHttpMiddlewareContext,
  ActorContext,
  AuthenticationError
> = async () => ok({ actor: { id: "actor-1" } });

const addTenant: HttpRequestMiddleware<
  Pick<ActorContext, "actor">,
  TenantContext,
  never
> = async () => ok({ tenantId: "tenant-1" });

const replaceActor: HttpRequestMiddleware<
  ActorContext,
  ActorContext,
  never
> = async () => ok({ actor: { id: "actor-2" } });

describe("executeHttpMiddlewareSequence", () => {
  it("runs middleware in order and accumulates context", async () => {
    const seen: string[] = [];
    const authenticate: HttpRequestMiddleware<
      EmptyHttpMiddlewareContext,
      ActorContext,
      AuthenticationError
    > = async ({ payload }) => {
      seen.push(`first:${String(payload.path)}`);
      return ok({ actor: { id: "actor-1" } });
    };
    const resolveTenant: HttpRequestMiddleware<
      ActorContext,
      TenantContext,
      never
    > = async ({ context }) => {
      seen.push(`second:${context.actor.id}`);
      return ok({ tenantId: "tenant-1" });
    };
    const middlewares = [authenticate, resolveTenant] as const;

    const result = await executeHttpMiddlewareSequence(
      { path: "/users/1" },
      middlewares,
    );

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      actor: { id: "actor-1" },
      tenantId: "tenant-1",
    });
    expect(seen).toEqual(["first:/users/1", "second:actor-1"]);
    expectTypeOf<HttpMiddlewareContext<typeof middlewares>>().toEqualTypeOf<{
      actor: { id: string };
      tenantId: string;
    }>();
    expectTypeOf<
      HttpMiddlewareErrors<typeof middlewares>
    >().toEqualTypeOf<AuthenticationError>();
  });

  it("stops at the first middleware error", async () => {
    const rejectRequest: HttpRequestMiddleware<
      EmptyHttpMiddlewareContext,
      EmptyHttpMiddlewareContext,
      AuthenticationError
    > = async () => err(new AuthenticationError());
    const secondMiddleware = vi.fn<
      HttpRequestMiddleware<
        EmptyHttpMiddlewareContext,
        { reached: boolean },
        never
      >
    >(async () => ok({ reached: true }));

    const result = await executeHttpMiddlewareSequence({}, [
      rejectRequest,
      secondMiddleware,
    ] as const);

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(AuthenticationError);
    expect(secondMiddleware).not.toHaveBeenCalled();
  });

  it("rejects duplicate context keys at runtime when types are bypassed", async () => {
    const addActorLocal: HttpRequestMiddleware<
      EmptyHttpMiddlewareContext,
      ActorContext,
      never
    > = async () => ok({ actor: { id: "actor-1" } });
    const disguisedDuplicate: HttpRequestMiddleware<
      ActorContext,
      TenantContext,
      never
    > = async () =>
      ok({ actor: { id: "actor-2" } } as unknown as TenantContext);

    await expect(
      executeHttpMiddlewareSequence({}, [
        addActorLocal,
        disguisedDuplicate,
      ] as const),
    ).rejects.toThrow("Duplicate middleware context key: actor");
  });
});

describe("executeHttpRequestPipeline", () => {
  it("runs middleware before validation and maps the final context", async () => {
    const calls: string[] = [];
    const payload: HttpRequestPayload = {
      body: { name: "Alice" },
      headers: { authorization: "Bearer token" },
      path: { id: "1" },
      query: { verbose: "true" },
    };
    const validator: InputValidator<
      HttpRequestPayload,
      { name: string }
    > = async (input) => {
      calls.push("validate");
      return ok({ name: String((input.body as { name: string }).name) });
    };
    const authenticate: HttpRequestMiddleware<
      EmptyHttpMiddlewareContext,
      ActorContext,
      never
    > = async ({ payload: request }) => {
      calls.push("authenticate");
      expect(request.headers).toEqual({ authorization: "Bearer token" });
      return ok({ actor: { id: "actor-1" } });
    };
    const resolveTenant: HttpRequestMiddleware<
      ActorContext,
      TenantContext,
      never
    > = async ({ context }) => {
      calls.push("tenant");
      expect(context.actor.id).toBe("actor-1");
      return ok({ tenantId: "tenant-1" });
    };

    const result = await executeHttpRequestPipeline(
      payload,
      validator,
      (input, context) => {
        calls.push("map");
        return {
          actorId: context.actor.id,
          name: input.name,
          tenantId: context.tenantId,
        };
      },
      async (input) => {
        calls.push("use-case");
        return ok(input);
      },
      [authenticate, resolveTenant] as const,
    );

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({
      actorId: "actor-1",
      name: "Alice",
      tenantId: "tenant-1",
    });
    expect(calls).toEqual([
      "authenticate",
      "tenant",
      "validate",
      "map",
      "use-case",
    ]);
  });

  it("does not validate or execute the use case after middleware fast-fail", async () => {
    const validator = vi.fn<InputValidator<HttpRequestPayload, object>>(
      async () => ok({}),
    );
    const inputMapper = vi.fn(() => ({}));
    const useCase = vi.fn(async () => ok({ ok: true }));
    const rejectRequest: HttpRequestMiddleware<
      EmptyHttpMiddlewareContext,
      EmptyHttpMiddlewareContext,
      AuthenticationError
    > = async () => err(new AuthenticationError());

    const result = await executeHttpRequestPipeline(
      {},
      validator,
      inputMapper,
      useCase,
      [rejectRequest] as const,
    );

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(AuthenticationError);
    expect(validator).not.toHaveBeenCalled();
    expect(inputMapper).not.toHaveBeenCalled();
    expect(useCase).not.toHaveBeenCalled();
  });

  it("keeps the existing flow when no middleware is supplied", async () => {
    const result = await executeHttpRequestPipeline(
      { path: { id: "1" } },
      async () => ok({ id: "1" }),
      (input) => ({ id: input.id }),
      async (input) => ok({ id: input.id }),
    );

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ id: "1" });
  });
});

describe("middleware sequence type contract", () => {
  it("accepts required context subsets in tuple order", () => {
    const middlewares = [addActor, addTenant] as const;
    const guard: EnsureHttpMiddlewareSequence<typeof middlewares> = {};

    expectTypeOf<HttpMiddlewareContext<typeof middlewares>>().toEqualTypeOf<{
      actor: { id: string };
      tenantId: string;
    }>();
    expectTypeOf<
      HttpMiddlewareErrors<typeof middlewares>
    >().toEqualTypeOf<AuthenticationError>();

    expect(guard).toEqual({});
    expect(middlewares).toHaveLength(2);
  });

  it("rejects missing context", () => {
    type MissingContext = EnsureHttpMiddlewareSequence<
      readonly [typeof addTenant]
    >;

    // @ts-expect-error - actor is unavailable to the first middleware
    const guard: MissingContext = {};

    expect(guard).toEqual({});
  });

  it("rejects invalid middleware order", () => {
    type InvalidSequence = readonly [typeof addTenant, typeof addActor];
    type InvalidOrder = EnsureHttpMiddlewareSequence<InvalidSequence>;

    // @ts-expect-error - middleware order does not satisfy actor dependency
    const guard: InvalidOrder = {};

    expectTypeOf<HttpMiddlewareContext<InvalidSequence>>().toEqualTypeOf<{
      actor: { id: string };
      tenantId: string;
    }>();
    expectTypeOf<
      HttpMiddlewareErrors<InvalidSequence>
    >().toEqualTypeOf<AuthenticationError>();
    expect(guard).toEqual({});
  });

  it("rejects duplicate context keys", () => {
    type DuplicateContext = EnsureHttpMiddlewareSequence<
      readonly [typeof addActor, typeof replaceActor]
    >;

    // @ts-expect-error - actor cannot be added twice
    const guard: DuplicateContext = {};

    expect(guard).toEqual({});
    expect(replaceActor).toBeTypeOf("function");
  });

  it("requires stored middleware collections to remain tuples", () => {
    const widened: HttpMiddlewareSequence = [addActor];
    type WidenedSequence = EnsureHttpMiddlewareSequence<typeof widened>;

    // @ts-expect-error - use `as const` to preserve tuple order
    const guard: WidenedSequence = {};

    expect(guard).toEqual({});
    expect(widened).toHaveLength(1);
  });

  it("exposes a readonly canonical payload", () => {
    const middleware: HttpRequestMiddleware<
      EmptyHttpMiddlewareContext,
      EmptyHttpMiddlewareContext,
      never
    > = async ({ payload }) => {
      // @ts-expect-error - middleware cannot replace canonical request parts
      payload.body = {};
      return ok({});
    };

    expect(middleware).toBeTypeOf("function");
  });
});
