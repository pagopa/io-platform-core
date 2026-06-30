# IO Example Hexagonal Fastify

Private example app demonstrating the registry-free / OpenAPI-free hexagonal Fastify adapter with the `widgets` resource. All use cases return "Not Implemented" until real domain behavior is added.

## Run

```sh
pnpm --filter io-example-hexagonal-fastify start
```

Default port: `7072`.

## Endpoints

| Method | Path                           | Request                                       | Success Response       |
| ------ | ------------------------------ | --------------------------------------------- | ---------------------- |
| GET    | `/api/v1/widgets`              | query: `page`, `pageSize`, `filter`           | `200` paginated list   |
| GET    | `/api/v1/widgets/{id}`         | path: `id`                                    | `200` widget           |
| POST   | `/api/v1/widgets`              | body: `name`, `description`                   | `201` widget           |
| PUT    | `/api/v1/widgets/{id}`         | path: `id`, body: `name`, `description`       | `200` widget           |
| PATCH  | `/api/v1/widgets/{id}`         | path: `id`, body: `name?`, `description?`     | `200` widget           |
| DELETE | `/api/v1/widgets/{id}`         | path: `id`                                    | `204` no body          |
| GET    | `/api/v1/widgets/{id}/summary` | path: `id`                                    | `200` widget summary   |
| GET    | `/api/v1/widgets/{id}/audit`   | path: `id`, header: `x-request-id`            | `200` audit events     |
| POST   | `/api/v1/widgets/{id}/refresh` | path: `id`                                    | `202` refresh accepted |
| POST   | `/api/v1/widgets/{id}/archive` | path: `id`                                    | `204` no body          |

All endpoints return `500` (`ProblemJson`) on unexpected errors; endpoints
accepting a body or `x-request-id` header also return `400` (`ProblemJson`) on
validation failures.
