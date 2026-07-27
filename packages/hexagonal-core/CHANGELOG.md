# @pagopa/hexagonal-core

## 0.5.0

### Minor Changes

- a254a2f: Add transport-neutral pre-validation HTTP middleware as ordered tuples of reusable functions, with typed context propagation, canonical request payloads, contract-aware RFC 7807 error validation, and Fastify route integration. Allow RFC 7807 problem type base URLs to be configured through the top-level Fastify route mount, defaulting to `about:blank` when omitted. Strengthen shared value-object nominal typing with exported runtime `unique symbol` brands passed directly to Zod, keeping schemas assertion-free and deriving public types through inference.

## 0.4.0

### Minor Changes

- a079d19: Enforce, at compile time, that a route contract declares the `400` (ValidationError) response whenever its `request` validates any part of the incoming request (body/headers/path/query).

  - `@pagopa/hexagonal-core` exports two new type helpers from `adapters`: `HasRequestValidation<Req>` and `EnsureValidationErrorDeclared<Req, Resp>`, plus the `MissingValidationErrorResponse` failure type they surface.

  This closes a gap left by `EnsureResponseCoversErrors`, which intentionally excludes `400` from its coverage check since the adapter always emits it on validation failure. Existing contracts that validate the request must now add a `400` entry (e.g. `400: ProblemJson`) to their `response` map.

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
