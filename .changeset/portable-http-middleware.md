---
"@pagopa/hexagonal-core": minor
"@pagopa/hexagonal-fastify": minor
---

Add transport-neutral pre-validation HTTP middleware as ordered tuples of reusable functions, with typed context propagation, canonical request payloads, contract-aware RFC 7807 error validation, and Fastify route integration. Allow RFC 7807 problem type base URLs to be configured through the top-level Fastify route mount, defaulting to `about:blank` when omitted. Strengthen shared value-object nominal typing with exported runtime `unique symbol` brands passed directly to Zod, keeping schemas assertion-free and deriving public types through inference.
