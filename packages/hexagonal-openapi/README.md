# @pagopa/hexagonal-openapi

Code-first OpenAPI toolkit for the IO platform. Declare HTTP routes as
framework-agnostic **contracts** built from [Zod](https://zod.dev) schemas, then
generate an OpenAPI 3.1 document from them. The route **registry** lives here and
only here; framework adapters (e.g. `@pagopa/hexagonal-fastify`) consume the
contract types but never touch registry state.

## Installation

```sh
pnpm add @pagopa/hexagonal-openapi zod
```

`zod` is a peer dependency. `defineRoute` and the minimal, runtime-only
`RouteContract`, plus the RFC 7807 `ProblemJson` schema, live in
`@pagopa/hexagonal-core/adapters`.

## What's inside

- **Contracts** — `defineRoute`, `RouteContract`, `ResponseMap`, `WireRequest`,
  `EnsureResponseCoversErrors`, `SuccessSchemaFromMap`, … live in
  [`@pagopa/hexagonal-core/adapters`](../hexagonal-core); this package consumes
  them (compile-time safety). Importing this package **augments** core's
  minimal `RouteContract` (via `declare module`) with the OpenAPI-only
  documentation metadata: `operationId` (required) plus optional `description`,
  `summary`, `tags` and `security`. So the extra fields become available on
  every contract in a project that generates an OpenAPI document, while a
  project that only mounts routes keeps the minimal contract. `defineRoute`
  stays strict either way — properties not declared on the (possibly augmented)
  contract are a compile-time error.
- **Registry** — `RouteRegistry` collects contracts and named component schemas.
- **Generator** — `buildOpenApiDocument` produces an OpenAPI 3.1 document.
- **YAML** — `openApiToYaml` / `writeOpenApiYaml` (with a CI `check` mode).

## Usage

```ts
import { defineRoute, ProblemJson } from "@pagopa/hexagonal-core/adapters";
import {
  buildOpenApiDocument,
  openApiToYaml,
} from "@pagopa/hexagonal-openapi";
import { z } from "zod";

const UserSchema = z.object({ id: z.string(), name: z.string() }).meta({
  id: "User",
});

const getUser = defineRoute({
  method: "get",
  operationId: "getUser",
  path: "/users/{id}",
  request: { path: z.object({ id: z.string() }) },
  response: {
    200: UserSchema,
    404: ProblemJson,
  },
});

const document = buildOpenApiDocument({
  document: { info: { title: "Users API", version: "1.0.0" } },
  namedSchemas: [UserSchema],
  routes: [getUser],
});

console.log(openApiToYaml(document));
```

## Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `pnpm build`         | Dual ESM + CJS build (tsdown)  |
| `pnpm typecheck`     | Type-check without emitting    |
| `pnpm lint`          | ESLint autofix                 |
| `pnpm test`          | Run tests with Vitest          |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm clean`         | Remove `dist/`                 |
