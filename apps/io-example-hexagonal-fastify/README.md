# IO Example Hexagonal Fastify

Private example app demonstrating the registry-free / OpenAPI-free hexagonal Fastify adapter with the `widgets` resource. All use cases return "Not Implemented" until real domain behavior is added.

## Run

```sh
pnpm --filter io-example-hexagonal-fastify start
```

Default port: `7072`.

## Endpoints

| Method | Path                         | Request                             | Response          |
| ------ | ---------------------------- | ----------------------------------- | ----------------- |
| GET    | `/api/v1/widgets`            | query: `page`, `pageSize`, `filter` | `200` widget list |
| GET    | `/api/v1/widgets/{id}`       | path: `id`                          | `200` widget      |
| POST   | `/api/v1/widgets`            | body                                | `201` widget      |
| PUT    | `/api/v1/widgets/{id}`       | path: `id`, body                    | `200` widget      |
| PATCH  | `/api/v1/widgets/{id}`       | path: `id`, body                    | `200` widget      |
| DELETE | `/api/v1/widgets/{id}`       | path: `id`                          | `204` no body     |
| GET    | `/api/v1/widgets/{id}/audit` | path: `id`, header: `x-request-id`  | `200` audit       |
