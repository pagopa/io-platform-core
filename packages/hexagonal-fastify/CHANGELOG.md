# @pagopa/hexagonal-fastify

## 0.3.0

### Minor Changes

- a254a2f: Integrate transport-neutral pre-validation HTTP middleware into `mountFastifyRoute`, running middleware after Fastify parsing and before request-schema validation, and pass the accumulated context to the route's `inputMapper`. Wire optional `ErrorResponderConfig` (including the RFC 7807 problem type base URL) through the top-level route mount so all handlers share the same configuration, defaulting to `about:blank` when omitted. Add `sendContractErrorResponse` to validate mapped errors against the route contract before writing the response.

### Patch Changes

- Updated dependencies [a254a2f]
  - @pagopa/hexagonal-core@0.5.0

## 0.2.0

### Minor Changes

- a079d19: Enforce, at compile time, that a route contract declares the `400` (ValidationError) response whenever its `request` validates any part of the incoming request (body/headers/path/query).

  - `@pagopa/hexagonal-fastify`'s `mountFastifyRoute` now intersects `EnsureValidationErrorDeclared<Req, Resp>` into its `contract` parameter. Mounting a contract that validates part of the request but omits `400` from `response` is now a compile error (previously this was only checked at runtime, via the adapter's request validator).

  This closes a gap left by `EnsureResponseCoversErrors`, which intentionally excludes `400` from its coverage check since the adapter always emits it on validation failure. Existing contracts that validate the request must now add a `400` entry (e.g. `400: ProblemJson`) to their `response` map.

### Patch Changes

- Updated dependencies [a079d19]
  - @pagopa/hexagonal-core@0.4.0

## 0.1.2

### Patch Changes

- Updated dependencies [f77022a]
  - @pagopa/hexagonal-core@0.3.0

## 0.1.1

### Patch Changes

- Updated dependencies [29c3a9a]
  - @pagopa/hexagonal-core@0.2.0

## 0.1.0

### Minor Changes

- 21d4ea8: Create the package/library `@pagopa/hexagonal-fastify` that provides helpers to implement the adapters using the fastify web framework for the hexagonal architecture proposal for IO.
  Refactor and extend error mapper in `@pagopa/hexagonal-core` to support the new error handling strategy in the IO platform.

### Patch Changes

- Updated dependencies [21d4ea8]
  - @pagopa/hexagonal-core@0.1.1
