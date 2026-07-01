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
    └── validator/       # createHttpRequestValidator, emptyValidator, …
```

## Entry points

| Import path                                   | Contents                           |
| --------------------------------------------- | ---------------------------------- |
| `@pagopa/hexagonal-core`                      | Everything (domain + adapters)     |
| `@pagopa/hexagonal-core/domain/errors`        | Domain errors                      |
| `@pagopa/hexagonal-core/domain/value-objects` | Branded value objects              |
| `@pagopa/hexagonal-core/domain/ports`         | Inbound port types                 |
| `@pagopa/hexagonal-core/adapters`             | Framework-agnostic adapter helpers |

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
import { EmailAddressSchema } from "@pagopa/hexagonal-core/value-objects";

const parsed = EmailAddressSchema.safeParse("User@Example.com");
// parsed.success === true, parsed.data === "user@example.com"
```

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

const { status, headers, jsonBody } = mapErrorToHttpResponse(
  new NotFoundError("User", "id-123"),
);
// status === 404
// headers["content-type"] === "application/problem+json"
// jsonBody is an RFC 7807 Problem Details object
```

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

## Middleware and cross-cutting concerns

Cross-cutting concerns — logging, tracing, metrics, audit logging, idempotency,
authorization, reusable business rules — must not leak into the domain or use
cases as direct dependencies, nor be re-implemented for every primary adapter
(Fastify, Azure Functions). `@pagopa/hexagonal-core` supports two
framework-agnostic middleware patterns that build on the `UseCase` port:

- **Use case decorator** — wrap a `UseCase` to add infrastructural behaviour.
- **Use case composition** — orchestrate smaller, reusable use cases as
  first-class business steps.

Both follow the same guiding principles:

1. **Cross-cutting dependencies enter as outbound ports** (`ILogger`, `IClock`,
   `IAuditLog`, `IPolicy`, …), injected through the `makeXxxUseCase(deps)`
   factory. A use case never imports a concrete logger or HTTP client.
2. **Everything stays `Result<_, BaseError>`.** Each decorator or orchestrated
   step returns the same error channel, so the single RFC 7807 error mapper
   (`mapErrorToHttpResponse`) keeps handling every response. Any new error type
   must be added to the route contract's `response` map.
3. **Context stays transport-neutral.** If a concern needs request metadata
   (headers, IP, correlation id), model it explicitly in the use-case input —
   never pass the raw `FastifyRequest`. The same chain then serves Fastify and
   Azure Functions.
4. **The mechanism follows the nature of the concern**, not convenience: an
   infrastructural detail is decorated, a reusable business rule is composed.

> A pipeline-middleware stage inside the handler builder is not currently
> supported by the core packages.

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
