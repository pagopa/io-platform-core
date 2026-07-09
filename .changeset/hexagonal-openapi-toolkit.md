---
"@pagopa/hexagonal-core": minor
"@pagopa/hexagonal-openapi": minor
---

Introduce `@pagopa/hexagonal-openapi`, the code-first OpenAPI toolkit for the IO platform: declare HTTP routes as framework-agnostic contracts built from Zod, generate an OpenAPI 3.1 document from them, and serialize it to YAML.

- `buildOpenApiDocument` — generates an OpenAPI 3.1 document directly from route contracts, built on Zod and `@asteasolutions/zod-to-openapi`; schemas carrying `.meta({ id })` (including the shared `ProblemDetails`) are auto-registered as reusable components and referenced via `$ref`. An optional `registerComponents` callback exposes the underlying registry for advanced use cases such as security schemes or explicit named-schema registration.
- `openApiToYaml` / `writeOpenApiYaml` — serialize the document to YAML, with a CI-friendly `check` mode to detect drift.
- Importing the package augments `@pagopa/hexagonal-core`'s `RouteContract` (via `declare module`) with the OpenAPI documentation metadata — `operationId` (required) plus optional `description`, `summary`, `tags` and `security` — so contracts in a project that generates an OpenAPI document get these fields automatically.

To support this, `@pagopa/hexagonal-core`'s `RouteContract` now only declares the fields needed to mount a route at runtime: `method`, `path`, `request`, `response`. The OpenAPI-only documentation fields (`operationId`, `description`, `summary`, `tags`, `security`) have been removed from it. `defineRoute` types its argument directly as `RouteContract`, so the compiler's excess-property check rejects any field not declared on the interface — contracts can no longer accumulate hidden, arbitrary properties. Extending the contract now requires an explicit type override, such as the augmentation shipped by `@pagopa/hexagonal-openapi`.
