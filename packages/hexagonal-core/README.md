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

| Import path                            | Contents                          |
| -------------------------------------- | --------------------------------- |
| `@pagopa/hexagonal-core`                | Everything (domain + adapters)    |
| `@pagopa/hexagonal-core/domain/errors`         | Domain errors                     |
| `@pagopa/hexagonal-core/domain/value-objects`  | Branded value objects             |
| `@pagopa/hexagonal-core/domain/ports`          | Inbound port types                |
| `@pagopa/hexagonal-core/adapters`       | Framework-agnostic adapter helpers |

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

## Scripts

| Command               | Description                          |
| --------------------- | ------------------------------------ |
| `pnpm build`          | Build dual ESM + CJS bundle (tsdown) |
| `pnpm typecheck`      | Type-check without emitting          |
| `pnpm lint`           | Run ESLint with autofix              |
| `pnpm lint:check`     | Run ESLint without fixing            |
| `pnpm test`           | Run unit tests (Vitest)              |
| `pnpm test:coverage`  | Run tests with a coverage report     |
| `pnpm clean`          | Remove `dist/`                       |
