# @pagopa/hexagonal-fastify

Fastify primary-adapter primitives for the IO platform hexagonal architecture.
Wire framework-agnostic use cases, validators and formatters (from
[`@pagopa/hexagonal-core`](../hexagonal-core)) onto Fastify, and mount code-first
route contracts (`defineRoute`, from `@pagopa/hexagonal-core/adapters`) — without
coupling your domain to the framework. Error mapping is delegated to the core
error mapper and never re-implemented here. The OpenAPI registry stays in
[`@pagopa/hexagonal-openapi`](../hexagonal-openapi); this adapter is
registry-free.

## Installation

```sh
pnpm add @pagopa/hexagonal-fastify @pagopa/hexagonal-core fastify zod neverthrow @standard-schema/spec
```

`fastify`, `zod`, `neverthrow` and `@standard-schema/spec` are peer dependencies.

## What's inside

- `createHttpHandler` — turns a `UseCase` + input validator + output formatter
  into a Fastify handler, replying with `application/problem+json` on errors.
- `mountFastifyRoute` — mounts a `defineRoute` contract on a Fastify instance,
  deriving validation, success status and response formatting from the contract.
- `createFastifyRequestValidator` / `fastifyExtractPayload` — bind the core
  Standard Schema validator to `FastifyRequest` (`path` from `request.params`).
- `sendErrorResponse` — write a domain error as RFC 7807 problem+json (delegates
  to the core error mapper).

## Usage

```ts
import { defineRoute, ProblemJson } from "@pagopa/hexagonal-core/adapters";
import { NotFoundError } from "@pagopa/hexagonal-core/domain/errors";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import Fastify from "fastify";
import { err, ok } from "neverthrow";
import { z } from "zod";

const UserSchema = z.object({ id: z.string(), name: z.string() }).meta({
  id: "User",
});

const app = Fastify();

mountFastifyRoute(app, {
  contract: defineRoute({
    method: "get",
    operationId: "getUser",
    path: "/users/{id}", // OpenAPI syntax; converted to Fastify ":id"
    request: { path: z.object({ id: z.string() }) },
    response: { 200: UserSchema, 404: ProblemJson },
  }),
  transformInput: (req) => ({ id: req.path.id }),
  useCase: async ({ id }) =>
    id === "1"
      ? ok({ id: "1", name: "Alice" })
      : err(new NotFoundError("User", id)),
});

await app.listen({ port: 3000 });
```

A request to `/users/1` returns `200` with the validated user; `/users/999`
returns `404` with an `application/problem+json` body.

## Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `pnpm build`         | Dual ESM + CJS build (tsdown)  |
| `pnpm typecheck`     | Type-check without emitting    |
| `pnpm lint`          | ESLint autofix                 |
| `pnpm test`          | Run tests with Vitest          |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm clean`         | Remove `dist/`                 |
