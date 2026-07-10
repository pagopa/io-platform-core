# IO Example Hexagonal Fastify

Private example app demonstrating the registry-free / OpenAPI-free hexagonal Fastify adapter with the `widgets` resource. All use cases return "Not Implemented" until real domain behavior is added.

The public API contract is also consumed by `@pagopa/hexagonal-openapi` to
produce a committed OpenAPI 3.1 spec.

## Run

```sh
pnpm --filter io-example-hexagonal-fastify start
```

Default port: `7072`.

## Endpoints

| Method | Path                           | Request                                   | Success Response       |
| ------ | ------------------------------ | ----------------------------------------- | ---------------------- |
| GET    | `/api/v1/widgets`              | query: `page`, `pageSize`, `filter`       | `200` paginated list   |
| GET    | `/api/v1/widgets/{id}`         | path: `id`                                | `200` widget           |
| POST   | `/api/v1/widgets`              | body: `name`, `description`               | `201` widget           |
| PUT    | `/api/v1/widgets/{id}`         | path: `id`, body: `name`, `description`   | `200` widget           |
| PATCH  | `/api/v1/widgets/{id}`         | path: `id`, body: `name?`, `description?` | `200` widget           |
| DELETE | `/api/v1/widgets/{id}`         | path: `id`                                | `204` no body          |
| GET    | `/api/v1/widgets/{id}/summary` | path: `id`                                | `200` widget summary   |
| GET    | `/api/v1/widgets/{id}/audit`   | path: `id`, header: `x-request-id`        | `200` audit events     |
| POST   | `/api/v1/widgets/{id}/refresh` | path: `id`                                | `202` refresh accepted |
| POST   | `/api/v1/widgets/{id}/archive` | path: `id`                                | `204` no body          |

All endpoints return `500` (`ProblemJson`) on unexpected errors; endpoints
accepting a body or `x-request-id` header also return `400` (`ProblemJson`) on
validation failures.

## OpenAPI generation

The OpenAPI 3.1 spec is generated from the same route contracts used to mount
the Fastify handlers, so the documentation and the runtime contract never drift.

```sh
pnpm --filter io-example-hexagonal-fastify generate
```

The generator reads the application version from `package.json` and writes the
stable, deterministic YAML to `openapi/openapi.yaml`. This file is committed to
the repository; the alignment test in `src/__tests__/openapi.test.ts` fails if
the committed spec is out of date.

> Do not edit `openapi/openapi.yaml` manually. Regenerate it with `pnpm generate`
> after any change to route contracts, DTO schemas, or `package.json` version.
