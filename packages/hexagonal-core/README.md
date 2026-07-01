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
