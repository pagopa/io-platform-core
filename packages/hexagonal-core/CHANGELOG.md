# @pagopa/hexagonal-core

## 0.1.0

### Minor Changes

- 89cae65: Initial release of `@pagopa/hexagonal-core`: framework-agnostic hexagonal building
  blocks for the IO platform. Bundles the shared domain layer (typed errors,
  branded value objects, inbound port contracts) and the framework-agnostic adapter
  layer (RFC 7807 error mapper with `mapErrorToProblemDetails` / `mapErrorToHttpResponse`,
  a Standard Schema output formatter and Standard Schema input-validation helpers).
  Published as a dual ESM + CommonJS build via tsdown.

  Initial release of `@pagopa/io-platform-typescript-config-node`: TS configuration for monorepo project
