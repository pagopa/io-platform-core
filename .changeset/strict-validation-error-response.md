---
"@pagopa/hexagonal-core": minor
"@pagopa/hexagonal-fastify": minor
---

Enforce, at compile time, that a route contract declares the `400` (ValidationError) response whenever its `request` validates any part of the incoming request (body/headers/path/query).

- `@pagopa/hexagonal-core` exports two new type helpers from `adapters`: `HasRequestValidation<Req>` and `EnsureValidationErrorDeclared<Req, Resp>`, plus the `MissingValidationErrorResponse` failure type they surface.
- `@pagopa/hexagonal-fastify`'s `mountFastifyRoute` now intersects `EnsureValidationErrorDeclared<Req, Resp>` into its `contract` parameter. Mounting a contract that validates part of the request but omits `400` from `response` is now a compile error (previously this was only checked at runtime, via the adapter's request validator).

This closes a gap left by `EnsureResponseCoversErrors`, which intentionally excludes `400` from its coverage check since the adapter always emits it on validation failure. Existing contracts that validate the request must now add a `400` entry (e.g. `400: ProblemJson`) to their `response` map.
