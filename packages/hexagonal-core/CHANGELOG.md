# @pagopa/hexagonal-core

## 0.3.0

### Minor Changes

  To support this, `@pagopa/hexagonal-core`'s `RouteContract` now only declares the fields needed to mount a route at runtime: `method`, `path`, `request`, `response`. The OpenAPI-only documentation fields (`operationId`, `description`, `summary`, `tags`, `security`) have been removed from it. `defineRoute` types its argument directly as `RouteContract`, so the compiler's excess-property check rejects any field not declared on the interface — contracts can no longer accumulate hidden, arbitrary properties. Extending the contract now requires an explicit type override, such as the augmentation shipped by `@pagopa/hexagonal-openapi`.

## 0.2.0

### Minor Changes

- 29c3a9a: Add a technology-agnostic `Logger` outbound port (`domain/ports/outbound`) and an
  opt-in Application Insights adapter (`@pagopa/hexagonal-core/adapters/logger`)
  that wraps the corporate `@pagopa/azure-tracing` library behind a narrow
  `AppInsightsTelemetryClient` seam. Ships `makeApplicationInsightsLogger`,
  `noopLogger` and the `LogLevel` → App Insights severity mapping. The corporate
  library is an optional peer dependency, so consumers that don't use App Insights
  never load it; the generic `./adapters` barrel stays vendor-free.

## 0.1.2

### Patch Changes

- ce3031b: Document middleware patterns in the README: use case decorator and use case composition.

## 0.1.1

### Patch Changes

- 21d4ea8: Create the package/library `@pagopa/hexagonal-fastify` that provides helpers to implement the adapters using the fastify web framework for the hexagonal architecture proposal for IO.
  Refactor and extend error mapper in `@pagopa/hexagonal-core` to support the new error handling strategy in the IO platform.

## 0.1.0

### Minor Changes

- 89cae65: Initial release of `@pagopa/hexagonal-core`: framework-agnostic hexagonal building
  blocks for the IO platform. Bundles the shared domain layer (typed errors,
  branded value objects, inbound port contracts) and the framework-agnostic adapter
  layer (RFC 7807 error mapper with `mapErrorToProblemDetails` / `mapErrorToHttpResponse`,
  a Standard Schema output formatter and Standard Schema input-validation helpers).
  Published as a dual ESM + CommonJS build via tsdown.

  Initial release of `@pagopa/io-platform-typescript-config-node`: TS configuration for monorepo project
