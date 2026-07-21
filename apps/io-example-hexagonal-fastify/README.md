# IO Example Hexagonal Fastify

Private example app demonstrating the registry-free / OpenAPI-free hexagonal Fastify adapter with the `widgets` resource. Most use cases return "Not Implemented" until real domain behavior is added; the summary and middleware examples are intentionally executable.

The public API contract is also consumed by `@pagopa/hexagonal-openapi` to
produce a committed OpenAPI 3.1 spec.

## Run

```sh
pnpm --filter io-example-hexagonal-fastify start
```

Default port: `7072`.

## Project structure

```
src/
  adapters/inbound/          # inbound Fastify handlers and route contracts
    dto/                     # adapter-specific DTOs used only by input/output mappers
    middleware/              # inbound middleware examples and their tests
    __tests__/               # adapter tests
  application/use-cases/     # use cases and business-logic utilities (with unit tests)
  domain/entities/           # domain model + shared request/response schemas
  createApp.ts               # composition root
  openapi.ts                 # route-contract assembly
```

### Layer rules

- **Shared schemas** live in `src/domain/entities/` when a request or response
  type passes unchanged between an inbound adapter and a use case.
- **Adapter DTOs** in `src/adapters/inbound/dto/` are reserved for shapes
  produced or consumed by input/output mappers (e.g. the summary response, the
  refresh accepted response, transport headers).
- The **application layer** contains only use cases and business-logic
  utilities, each with unit tests. DTO schemas and adapter imports do not belong
  here.

## Endpoints

| Method | Path                                         | Request                                                                               | Success Response       |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------- |
| GET    | `/api/v1/widgets`                            | query: `page`, `pageSize`, `filter`                                                   | `200` paginated list   |
| GET    | `/api/v1/widgets/{id}`                       | path: `id`                                                                            | `200` widget           |
| POST   | `/api/v1/widgets`                            | body: `name`, `description`                                                           | `201` widget           |
| PUT    | `/api/v1/widgets/{id}`                       | path: `id`, body: `name`, `description`                                               | `200` widget           |
| PATCH  | `/api/v1/widgets/{id}`                       | path: `id`, body: `name?`, `description?`                                             | `200` widget           |
| DELETE | `/api/v1/widgets/{id}`                       | path: `id`                                                                            | `204` no body          |
| GET    | `/api/v1/widgets/{id}/summary`               | path: `id`                                                                            | `200` widget summary   |
| GET    | `/api/v1/widgets/{id}/authenticated-summary` | path: `id`, header: `authorization`                                                   | `200` widget summary   |
| GET    | `/api/v1/widgets/{id}/access`                | path: `id`, headers: `authorization`, `x-forwarded-for?`, `x-user-email`, `x-user-id` | `200` access context   |
| GET    | `/api/v1/widgets/{id}/audit`                 | path: `id`, header: `x-request-id`                                                    | `200` audit events     |
| POST   | `/api/v1/widgets/{id}/refresh`               | path: `id`                                                                            | `202` refresh accepted |
| POST   | `/api/v1/widgets/{id}/archive`               | path: `id`                                                                            | `204` no body          |

All endpoints return `500` (`ProblemJson`) on unexpected errors; endpoints
accepting a body or `x-request-id` return `400` (`ProblemJson`) on validation
failures. The authenticated summary route uses a single inbound middleware and
returns `401` when `authorization` is missing. The access route composes
authentication, client-IP extraction, and caller attribute resolution; it
returns `401` when authentication or caller headers are unavailable and returns
the resolved context in the response.

## OpenAPI generation

The OpenAPI 3.1 spec is generated from the same route contracts used to mount
the Fastify handlers, so the documentation and the runtime contract never drift.

```sh
pnpm --filter io-example-hexagonal-fastify generate
```

The generator reads the application version from `package.json` and writes the
stable, deterministic YAML to `openapi/internal.yaml`. This file is committed to
the repository; the alignment test in `src/__tests__/openapi.test.ts` fails if
the committed spec is out of date.

> Do not edit `openapi/internal.yaml` manually. Regenerate it with `pnpm generate`
> after any change to route contracts, DTO schemas, or `package.json` version.
