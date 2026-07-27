# ADR 0001: Eager canonical HTTP payload for pre-validation middleware

- Status: Accepted
- Scope: `@pagopa/hexagonal-core` and inbound HTTP adapters

## Context

HTTP middleware must run after a transport adapter has parsed the request but
before the route's Standard Schema validation. The same middleware sequence
must be reusable by Fastify and a future Azure Functions adapter, so middleware
cannot receive a native request object, raw stream, framework reply, or a
generic metadata bag.

The middleware also needs a stable view of the request parts that are relevant
to route contracts: `body`, `headers`, `path`, and `query`. Later stages need the
same request view, while the input mapper additionally needs the context built
by preceding middleware stages.

Two payload representations were considered:

1. An eager canonical snapshot created by the adapter before the sequence starts.
2. A lazy facade that stores adapter-specific accessors and resolves each
   request part only when middleware reads it.

## Decision

Use an eager, readonly `HttpRequestPayload` snapshot:

```ts
interface HttpRequestPayload {
  readonly body?: unknown;
  readonly headers?: unknown;
  readonly path?: unknown;
  readonly query?: unknown;
}
```

Adapters own extraction. The portable middleware are standalone functions in an
ordered readonly tuple and receive only this snapshot plus an append-only
context. Each middleware declares the minimum context it requires and returns a
new context fragment or an `HttpMappedError`. A type-level fold verifies tuple
order and unique keys while deriving the final context and error union. Stages
run serially and the first error stops the sequence. The core pipeline then
validates the same snapshot and calls the contextual input mapper only after
middleware and request validation succeed.

## Why eager

| Concern             | Eager snapshot                               | Lazy facade                           |
| ------------------- | -------------------------------------------- | ------------------------------------- |
| Adapter boundary    | One explicit conversion point                | Accessors retain adapter knowledge    |
| Cross-adapter reuse | Same plain data shape everywhere             | Facade semantics can vary by adapter  |
| Ordering            | Parsing is complete before middleware starts | Reads can trigger hidden parsing work |
| Repeated reads      | Stable value shared by all stages            | May repeat or cache adapter work      |
| Testing             | Plain object fixtures                        | Requires mocking accessor behavior    |
| Memory              | Copies references to four top-level parts    | Slightly smaller wrapper object       |

The memory difference is not meaningful for the request sizes in scope: the
snapshot copies the top-level references, not deep request data. The explicit
boundary and predictable execution order are more valuable than lazy access.

## Consequences

Positive consequences:

- Fastify and Azure Functions can share the same middleware and pipeline code.
- Middleware has canonical access to `body`, `headers`, `path`, and `query`.
- Standalone middleware and their sequence are easy to test without a running
  framework.
- Readonly input makes accidental request mutation visible during development.
- Context injection is explicit, typed, append-only, and available to the input
  mapper.

Trade-offs:

- An adapter must perform parsing and build the snapshot before invoking the
  portable sequence.
- The snapshot contains `unknown` values until route-specific validation runs;
  middleware must narrow or parse values it owns.
- A future adapter cannot defer expensive request-body parsing through this API.
  If that becomes necessary, it must parse before entering this v1 pipeline or
  introduce a separately versioned abstraction.

## Contract enforcement

Middleware errors are mapped through the core RFC 7807 error mapper. Their HTTP
statuses must appear in the route response map. Every declared non-success
response schema must accept the mapped Problem Details input and return a
Problem Details-compatible output. The runtime responder validates the mapped
body against the selected contract entry and falls back to `500` if a contract
was bypassed or a runtime refinement rejects the body.

## Future adapters

A future Azure Functions adapter should map its trigger request to the same
`HttpRequestPayload`, call the shared middleware sequence and core pipeline, then
translate the resulting `HttpErrorResponse` into the Azure response shape. It
should not add Azure-specific fields to the portable middleware input.
