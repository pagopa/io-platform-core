# @pagopa/hexagonal-core

Framework-agnostic hexagonal building blocks (shared **domain** + **adapter**
primitives) for the IO platform ecosystem.

## Overview

`@pagopa/hexagonal-core` bundles the reusable pieces of a hexagonal
(ports & adapters) application so they don't have to be re-implemented in every
service:

- the common **domain** layer — typed errors, branded value objects and the
  inbound port contracts (`UseCase`, `InputValidator`, `OutputFormatter`);
- the framework-agnostic **adapter** layer — an RFC 7807 error mapper, a
  Standard Schema output formatter and Standard Schema input-validation helpers.

It deliberately **excludes** any framework-specific code: concrete adapters for
web frameworks (e.g. fastify, Azure Functions) live in their own packages and
build on top of these primitives.

## Install

```sh
pnpm add @pagopa/hexagonal-core
```

## Module formats

The package ships a dual **ESM + CommonJS** build with per-format type
declarations (built with [tsdown](https://tsdown.dev)), so it can be consumed
from either module system.

## Structure

```
src/
├── domain/
│   ├── errors/          # BaseError + typed domain errors
│   ├── value-objects/   # zod branded value objects (EmailAddress, FiscalCode, …)
│   └── ports/inbound/   # UseCase, InputValidator, OutputFormatter contracts
└── adapters/
    ├── error-mapper/    # mapErrorToProblemDetails, mapErrorToHttpResponse (RFC 7807)
    ├── formatter/       # createHttpResponseFormatter, identityFormatter
    ├── logger/          # makeApplicationInsightsLogger (App Insights via @pagopa/azure-tracing), noopLogger
    └── validator/       # createHttpRequestValidator, emptyValidator, …
```

## Entry points

| Import path                                   | Contents                                     |
| --------------------------------------------- | -------------------------------------------- |
| `@pagopa/hexagonal-core`                      | Everything (domain + adapters)               |
| `@pagopa/hexagonal-core/domain/errors`        | Domain errors                                |
| `@pagopa/hexagonal-core/domain/value-objects` | Branded value objects                        |
| `@pagopa/hexagonal-core/domain/ports`         | Inbound + outbound port types                |
| `@pagopa/hexagonal-core/adapters`             | Framework-agnostic adapter helpers           |
| `@pagopa/hexagonal-core/adapters/logger`      | Application Insights logger adapter (opt-in) |

## Usage

### Domain errors

```ts
import { NotFoundError } from "@pagopa/hexagonal-core/domain/errors";

const error = new NotFoundError("User", "id-123");
error.kind; // "NotFoundError"
error.tag; //  "not-found"
```

### Value objects

```ts
import { EmailAddressSchema } from "@pagopa/hexagonal-core/domain/value-objects";

const parsed = EmailAddressSchema.safeParse("User@Example.com");
// parsed.success === true, parsed.data === "user@example.com"
```

Define branded value objects with an exported runtime symbol, pass that symbol
to Zod, and infer the public type from the schema:

```ts
import { z } from "zod";

export const OrderIdBrand = Symbol("OrderId");

export const OrderIdSchema = z.string().uuid().brand(OrderIdBrand);

export type OrderId = z.infer<typeof OrderIdSchema>;
```

Using a dedicated `unique symbol` makes each value object nominally distinct,
even when two schemas share the same primitive validation. Passing the runtime
symbol to `.brand(...)` keeps schema and type inference lean: do not recreate
brands with string literals, `declare const`, manual `z.core.$brand`
intersections, or schema type assertions.

### Inbound ports

```ts
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import { ConflictError } from "@pagopa/hexagonal-core/domain/errors";

type CreateUser = UseCase<{ email: string }, { id: string }, ConflictError>;
```

### Map a domain error to an HTTP response (in any framework adapter)

```ts
import { mapErrorToHttpResponse } from "@pagopa/hexagonal-core/adapters";
import { NotFoundError } from "@pagopa/hexagonal-core/domain/errors";

const { status, headers, jsonBody } = mapErrorToHttpResponse({
  typeBaseUrl: "https://example.pagopa.it/problems/",
})(new NotFoundError("User", "id-123"));
// status === 404
// headers["content-type"] === "application/problem+json"
// jsonBody.type === "https://example.pagopa.it/problems/not-found"
// jsonBody is an RFC 7807 Problem Details object
```

When `typeBaseUrl` is omitted, `jsonBody.type` defaults to `about:blank`.

### Validate a request with a Standard Schema

`createHttpRequestValidator` is framework-agnostic: you provide an `extractPayload`
function that maps your framework's request object into the canonical
`HttpRequestPayload` (`body` / `headers` / `path` / `query`).

```ts
import {
  createHttpRequestValidator,
  type HttpRequestPayload,
} from "@pagopa/hexagonal-core/adapters";
import { z } from "zod";

const schema = z.object({ path: z.object({ id: z.string() }) });

const validate = createHttpRequestValidator(
  schema,
  (request: MyFrameworkRequest): HttpRequestPayload => ({
    path: request.params,
  }),
);

const result = await validate(request); // Result<{ path: { id: string } }, ValidationError>
```

### Logging & telemetry (Application Insights)

The `Logger` port is technology-agnostic; the concrete adapter wraps the
corporate **`@pagopa/azure-tracing`** library (Tech Radar `pagopa-azure-tracing`)
— never the raw `applicationinsights` client. Depend on the **port** in your
application layer, and wire the adapter only in the composition root.

The adapter consumes a narrow structural seam (`AppInsightsTelemetryClient`), so
the composition root bootstraps the corporate library once and passes a small
shim that maps it onto the seam:

```ts
import { makeApplicationInsightsLogger } from "@pagopa/hexagonal-core/adapters/logger";
import type { AppInsightsTelemetryClient } from "@pagopa/hexagonal-core/adapters/logger";
import { initAzureMonitor } from "@pagopa/azure-tracing/azure-monitor";
import { emitCustomEvent } from "@pagopa/azure-tracing/logger";
import { logs, SeverityNumber } from "@opentelemetry/api-logs";

// 1. Bootstrap OpenTelemetry / Azure Monitor ONCE at process start.
//    Reads APPLICATIONINSIGHTS_CONNECTION_STRING from the environment.
initAzureMonitor();

// 2. Shim the corporate library onto the adapter's structural seam.
const aiLogger = logs.getLogger("io-user-profile");
const stringify = (p?: Record<string, unknown>): Record<string, string> =>
  Object.fromEntries(Object.entries(p ?? {}).map(([k, v]) => [k, String(v)]));

const client: AppInsightsTelemetryClient = {
  trackTrace: ({ message, severity, properties }) =>
    aiLogger.emit({
      body: message,
      severityNumber: severity as unknown as SeverityNumber,
      attributes: stringify(properties),
    }),
  trackEvent: ({ name, properties }) =>
    emitCustomEvent(name, stringify(properties))(),
  trackException: ({ exception, properties }) =>
    aiLogger.emit({
      body: exception.message,
      severityNumber: SeverityNumber.ERROR,
      attributes: {
        ...stringify(properties),
        "exception.stack": exception.stack ?? "",
      },
    }),
};

// 3. Build the port and inject it into your use-case factories.
const logger = makeApplicationInsightsLogger({
  client,
  baseProperties: { service: "io-user-profile" },
});

logger.info("profile fetched", { userId: "u1" }); // → traces (Information)
logger.trackEvent({ name: "UserProfileCreated" }); // → customEvents
logger.trackException({ error: new Error("boom") }); // → exceptions

const requestLogger = logger.with({ correlationId: "c-123" }); // child logger
await logger.flush(); // flush before a serverless worker suspends
```

Depend on the **port**, not the adapter, in your application layer:

```ts
import type { Logger } from "@pagopa/hexagonal-core/domain/ports";

const makeCreateUserProfileUseCase =
  (deps: { logger: Logger }) => async (input: { fiscalCode: string }) => {
    deps.logger.debug("creating profile", { fiscalCode: input.fiscalCode });
    // …
  };
```

For testing, use the bundled null object:

```ts
import { noopLogger } from "@pagopa/hexagonal-core/adapters/logger";

const useCase = makeCreateUserProfileUseCase({ logger: noopLogger });
```

## Middleware and cross-cutting concerns

Cross-cutting concerns — logging, tracing, metrics, audit logging, idempotency,
authorization, reusable business rules — must not leak into the domain or use
cases as direct dependencies, nor be re-implemented for every primary adapter
(Fastify, Azure Functions). `@pagopa/hexagonal-core` supports three
framework-agnostic middleware patterns:

- **HTTP request middleware** — inspect a parsed request and short-circuit
  before request-schema validation.
- **Use case decorator** — wrap a `UseCase` to add infrastructural behaviour.
- **Use case composition** — orchestrate smaller, reusable use cases as
  first-class business steps.

All follow the same guiding principles:

1. **Cross-cutting dependencies enter as outbound ports** (`ILogger`, `IClock`,
   `IAuditLog`, `IPolicy`, …), injected through the `makeXxxUseCase(deps)`
   factory. A use case never imports a concrete logger or HTTP client.
2. **Everything stays `Result<_, BaseError>`.** Each decorator or orchestrated
   step returns the same error channel, so the single RFC 7807 error mapper
   (`mapErrorToHttpResponse`) keeps handling every response. Any new error type
   must be added to the route contract's `response` map.
3. **Context stays transport-neutral.** HTTP middleware receives the canonical
   `body` / `headers` / `path` / `query` payload and an append-only context. It
   never receives a native `FastifyRequest`, Azure request, raw stream or
   generic `meta` object. The same sequence serves Fastify and Azure Functions.
4. **The mechanism follows the nature of the concern**, not convenience: an
   infrastructural detail is decorated, a reusable business rule is composed.

### HTTP request middleware

HTTP middleware are standalone functions assembled into an ordered readonly
tuple. The sequence runs after the adapter has parsed the request and before the
declared request schemas run. Each function declares the minimum context it
requires and returns only the new context fragment it owns. TypeScript verifies
the tuple order and unique context keys, then derives its final context and
error union. An `err` stops the sequence immediately, so later middleware,
request validation, the input mapper and the use case do not run.

```ts
import {
  defineRoute,
  type EmptyHttpMiddlewareContext,
  type HttpRequestMiddleware,
  ProblemJson,
} from "@pagopa/hexagonal-core/adapters";
import { AuthenticationError } from "@pagopa/hexagonal-core/domain/errors";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import { err, ok } from "neverthrow";
import { z } from "zod";

interface ActorContext {
  actorId: string;
}

const authenticate: HttpRequestMiddleware<
  EmptyHttpMiddlewareContext,
  ActorContext,
  AuthenticationError
> = async ({ payload }) => {
  const headers = payload.headers as { authorization?: string } | undefined;
  return headers?.authorization
    ? ok({ actorId: headers.authorization })
    : err(new AuthenticationError());
};

const resolveTenant: HttpRequestMiddleware<
  Pick<ActorContext, "actorId">,
  { tenantId: string },
  never
> = async ({ context }) => ok({ tenantId: `tenant-for-${context.actorId}` });

const middlewares = [authenticate, resolveTenant] as const;

mountFastifyRoute(app, {
  contract: defineRoute({
    method: "post",
    path: "/users",
    request: {
      body: z.object({ name: z.string() }),
      headers: z.object({ authorization: z.string() }),
    },
    response: { 200: UserSchema, 400: ProblemJson, 401: ProblemJson },
  }),
  middlewares,
  inputMapper: (request, context) => ({
    actorId: context.actorId,
    name: request.body.name,
    tenantId: context.tenantId,
  }),
  useCase,
});
```

The payload is an eager, readonly snapshot with only `body`, `headers`,
`path`, and `query`. The adapter owns extraction, so a future Azure Functions
adapter can reuse the same sequence by supplying its own extractor. A stored
middleware sequence uses `as const` to retain tuple order; a tuple literal
passed directly to `mountFastifyRoute` is inferred as a tuple automatically.
Error response statuses must be declared in the route contract, and every
declared error schema must accept and return the RFC 7807 `ProblemDetails`
shape. The mount also validates the mapped error response at runtime and falls
back to `500` if an invalid contract is bypassed.

Use HTTP middleware for authentication, correlation extraction, rate limiting
and other concerns that must run before validation. Use a use-case decorator
when the concern needs validated input or application dependencies instead.

### Use case decorator

Because `UseCase<Input, Output, Error>` is a function type, it can be wrapped by
a higher-order function: `withTiming(logger)(useCase)`,
`withAuthorization(policy)(useCase)`. Decorators live in the `application/`
layer and are composed at wiring time in `createApp.ts`; their dependencies are
injected as outbound ports.

An infrastructural decorator preserves the use-case error type `E` untouched:

```ts
import type { BaseError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";

// `ILogger` is an outbound port you define and inject.
const withTiming =
  (logger: ILogger) =>
  <I extends object, O, E extends BaseError>(
    useCase: UseCase<I, O, E>,
  ): UseCase<I, O, E> =>
  async (input) => {
    const startedAt = Date.now();
    const result = await useCase(input);
    logger.info({ ok: result.isOk(), ms: Date.now() - startedAt });
    return result;
  };
```

A decorator that adds a failure mode **widens the error channel** — the route
contract must then declare the corresponding status (e.g. `403`):

```ts
import type { BaseError } from "@pagopa/hexagonal-core/domain/errors";
import { ForbiddenError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import { err } from "neverthrow";

// `IPolicy` is an outbound port; `Actor` is your caller identity type.
const withAuthorization =
  (policy: IPolicy) =>
  <I extends { actor: Actor }, O, E extends BaseError>(
    useCase: UseCase<I, O, E>,
  ): UseCase<I, O, E | ForbiddenError> =>
  async (input) =>
    (await policy.allows(input.actor))
      ? useCase(input)
      : err(new ForbiddenError());
```

Compose decorators explicitly at wiring time (`createApp.ts`):

```ts
const getWidget = withTiming(logger)(
  withAuthorization(policy)(makeGetWidgetUseCase(deps)),
);
```

**Recommended for:** logging, tracing, metrics, audit logging (emit),
idempotency, and application-level authorization — infrastructural concerns that
wrap a use case without being part of the business logic itself.

- ✅ Stays in the application layer; framework-agnostic (identical for Fastify
  and Azure Functions); operates on typed input; preserves the `Result`.
- ⚠️ Runs **after** input validation (it wraps the use case): it cannot
  short-circuit before validation, concerns needing raw headers must model them
  in the input, and the composition order is manual.

### Use case composition

An **orchestrator** use case calls smaller, reusable use cases internally — each
encapsulating a slice of business logic — and stops at the first `err`:

```ts
import { err, ok } from "neverthrow";

// `checkEntitlement`, `saveWidget`, `emitAudit` are themselves `UseCase`s.
const makePublishWidgetUseCase =
  (deps: {
    checkEntitlement: CheckEntitlementUseCase; // reusable domain rule
    saveWidget: SaveWidgetUseCase;
    emitAudit: EmitWidgetEventUseCase;
  }): PublishWidgetUseCase =>
  async (input) => {
    const entitled = await deps.checkEntitlement({
      actor: input.actor,
      id: input.id,
    });
    if (entitled.isErr()) return err(entitled.error);

    const saved = await deps.saveWidget({ id: input.id, patch: input.patch });
    if (saved.isErr()) return err(saved.error);

    const audited = await deps.emitAudit({
      event: "WidgetPublished",
      id: saved.value.id,
    });
    return audited.isErr() ? err(audited.error) : ok(saved.value);
  };
```

The same sequencing can be written fluently with `neverthrow`'s `ResultAsync`
and chained `.andThen(...)` calls.

**Recommended for:** reusable business rules and entitlement checks, enforcement
of domain preconditions, and audit recorded as a _domain event_ — concerns that
are part of the ubiquitous language.

- ✅ Keeps business-relevant steps as first-class, testable, reusable units; no
  new framework concept (just functions returning `Result`); fully
  transport-agnostic.
- ⚠️ Suited **only** to business logic: forcing infrastructural concerns
  (generic logging, tracing) here pollutes the domain and duplicates code in
  every orchestrator. Watch for "god object" orchestrators; atomicity across
  inner use cases requires a shared transaction (unit-of-work) port.

### Choosing a mechanism

| Concern                               | Nature                | Mechanism                                      | Port                          |
| ------------------------------------- | --------------------- | ---------------------------------------------- | ----------------------------- |
| Logging / tracing / metrics           | Infrastructure        | Decorator                                      | `ILogger`, `ITracer`          |
| Security audit log                    | Infra or domain event | Decorator (emit) or Composition (domain event) | `IAuditLog`                   |
| Application authorization             | Application           | Decorator (widens `ForbiddenError`)            | `IPolicy`                     |
| Entitlement / reusable business rules | Business              | Composition                                    | ports of the involved domains |
| Preconditions enforcement             | Business              | Composition                                    | precondition port             |

**Rule of thumb:** infrastructure _around_ the use case → decorator; reusable
_business_ logic → composition. Both leave the domain pure, keep errors as
values.

## Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `pnpm build`         | Build dual ESM + CJS bundle (tsdown) |
| `pnpm typecheck`     | Type-check without emitting          |
| `pnpm lint`          | Run ESLint with autofix              |
| `pnpm lint:check`    | Run ESLint without fixing            |
| `pnpm test`          | Run unit tests (Vitest)              |
| `pnpm test:coverage` | Run tests with a coverage report     |
| `pnpm clean`         | Remove `dist/`                       |
