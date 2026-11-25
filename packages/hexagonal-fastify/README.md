# @pagopa/hexagonal-fastify

Fastify primary-adapter primitives for the IO platform hexagonal architecture.
Wire framework-agnostic use cases, validators and formatters (from
[`@pagopa/hexagonal-core`](../hexagonal-core)) onto Fastify, and mount code-first
route contracts (`defineRoute`, from `@pagopa/hexagonal-core/adapters`) — without
coupling your domain to the framework. Error mapping is delegated to the core
error mapper and never re-implemented here. The OpenAPI registry stays in
[`@pagopa/hexagonal-openapi`](../hexagonal-openapi); this adapter is
registry-free.

## Installation

```sh
pnpm add @pagopa/hexagonal-fastify @pagopa/hexagonal-core fastify zod neverthrow @standard-schema/spec
```

`fastify`, `zod`, `neverthrow` and `@standard-schema/spec` are peer dependencies.

## What's inside

- `createHttpHandler` — turns a `UseCase` + input validator + success responder
  into a Fastify handler, replying with `application/problem+json` on errors.
- `mountFastifyRoute` — mounts a `defineRoute` contract and validates request
  and success responses. An `outputMapper` returns a status-discriminated
  `{ status, body, headers }` description inferred from the declared responses.
  Multiple success statuses and required custom headers require a mapper. With
  one success and no additional required headers, the default uses the use-case
  output as the body, ignores it for `204`, or uses a string as redirect Location.
  Optional `middlewares` run after Fastify parsing and before request-schema
  validation; their append-only context is passed to `inputMapper`.
  Custom response-header schemas are supported on success responses only;
  error headers remain owned by the RFC 7807 mapper.
- `createFastifyRequestValidator` / `fastifyExtractPayload` — bind the core
  Standard Schema validator to `FastifyRequest` (`path` from `request.params`).
- `sendErrorResponse` — write a domain error as RFC 7807 problem+json (delegates
  to the core error mapper).

## Adapter architecture

`mountFastifyRoute` wires the shared route contract to Fastify. The same contract
feeds OpenAPI generation through `@pagopa/hexagonal-openapi`; the adapter is
registry-free and does not read a generated OpenAPI document at runtime.

HTTP middleware receives a readonly canonical snapshot of `body`, `headers`,
`path` and `query`, not the native Fastify request. Its ordered tuple builds an
append-only context: required keys must already exist and existing keys cannot
be replaced. Stored sequences use `as const`; inline tuple literals do not
need it. `inputMapper` converts validated request data and this context into
use-case input. Application decorators wrap the use case at composition time;
their entry and return phases are not separate adapter APIs. Domain and
application code remain independent of HTTP and Fastify.

The diagram shows the complete flow, with the response stage defined by
[ADR 0001](docs/adr/0001-complete-http-response-output-mapper.md) marked as the
target design. The current API still accepts exactly one success response and
maps only its body, or its redirect destination; it does not yet expose the
complete-response mapper described in the ADR. Request and response handling
are responsibilities of the same inbound adapter, not separate inbound and
outbound adapters.

```mermaid
flowchart TB
    ClientIn["HTTP client · request"]
    subgraph AdapterIn["Inbound adapter · request handling"]
        Parse["Fastify parsing and canonical payload extraction"]
        HttpMW["HTTP request middleware"]
        ZodIn["Zod input decoding · body, headers, path, query"]
        InputMapper["inputMapper · domain input"]
        Parse --> HttpMW --> ZodIn --> InputMapper
    end
    subgraph Application["Application · no HTTP or Fastify dependencies"]
        Before["Optional use-case decorators · entry"]
        UC["Use case"]
        After["Optional use-case decorators · return"]
        Before --> UC --> After
    end
    subgraph AdapterOut["Same inbound adapter · response handling · ADR 0001 target"]
        OutputMapper["outputMapper · explicit or eligible single-success default"]
        Validate["Declared status check + Zod validation · body if allowed, headers"]
        Send["FastifyReply · validated response"]
        Errors["RFC 7807 error mapping · contract validation / 500 fallback"]
        OutputMapper --> Validate --> Send
        Errors --> Send
    end
    ClientOut["HTTP client · response"]
    ClientIn --> Parse
    InputMapper --> Before
    After -->|"Result ok · domain output"| OutputMapper
    Send --> ClientOut
    HttpMW -->|"Result err · short-circuit"| Errors
    ZodIn -->|"Invalid input · 400"| Errors
    Before -->|"Result err"| Errors
    UC -->|"Result err"| Errors
    After -->|"Result err"| Errors
    Validate -->|"Contract violation · 500"| Errors
```

Middleware errors stop the request before validation and execution. Every
middleware or use-case error status must be declared in the route contract;
request-schema validation also requires a `400` response. Non-success schemas
must accept and return RFC 7807 Problem Details. The responder validates mapped
errors and falls back to `500` if the error response violates its contract.

See the core documentation for
[HTTP middleware, application decorators and use-case composition](../hexagonal-core/README.md#middleware-and-cross-cutting-concerns),
and the [canonical-payload ADR](../hexagonal-core/docs/adr/0001-eager-canonical-http-payload-for-pre-validation-middleware.md)
for the shared request boundary.

## Usage

```ts
import {
  defineRoute,
  type EmptyHttpMiddlewareContext,
  type HttpRequestMiddleware,
  ProblemJson,
} from "@pagopa/hexagonal-core/adapters";
import {
  AuthenticationError,
  NotFoundError,
} from "@pagopa/hexagonal-core/domain/errors";
import { mountFastifyRoute } from "@pagopa/hexagonal-fastify";
import Fastify from "fastify";
import { err, ok } from "neverthrow";
import { z } from "zod";

const UserSchema = z.object({ id: z.string(), name: z.string() }).meta({
  id: "User",
});

interface ActorContext {
  actorId: string;
}

const authenticate: HttpRequestMiddleware<
  EmptyHttpMiddlewareContext,
  ActorContext,
  AuthenticationError
> = async ({ payload }) => {
  const headers = payload.headers as { authorization?: string } | undefined;
  return headers?.authorization
    ? ok({ actorId: headers.authorization })
    : err(new AuthenticationError());
};

const resolveTenant: HttpRequestMiddleware<
  Pick<ActorContext, "actorId">,
  { tenantId: string },
  never
> = async ({ context }) => ok({ tenantId: `tenant-for-${context.actorId}` });

const middlewares = [authenticate, resolveTenant] as const;

const app = Fastify();

mountFastifyRoute(
  app,
  {
    contract: defineRoute({
      method: "get",
      operationId: "getUser",
      path: "/users/{id}", // OpenAPI syntax; converted to Fastify ":id"
      request: { path: z.object({ id: z.string() }) },
      response: {
        200: UserSchema,
        400: ProblemJson,
        401: ProblemJson,
        404: ProblemJson,
      },
    }),
    middlewares,
    inputMapper: (req, context) => ({
      actorId: context.actorId,
      id: req.path.id,
      tenantId: context.tenantId,
    }),
    useCase: async ({ id }) =>
      id === "1"
        ? ok({ id: "1", name: "Alice" })
        : err(new NotFoundError("User", id)),
  },
  {
    typeBaseUrl: "https://example.pagopa.it/problems/",
  },
);

await app.listen({ port: 3000 });
```

A request to `/users/1` returns `200` with the validated user; `/users/999`
returns `404` with an `application/problem+json` body.

The middleware receives a readonly canonical snapshot containing only `body`,
`headers`, `path` and `query`. It runs before the request schemas, and an error
short-circuits the remaining middleware, validation, mapper and use case. The
ordered tuple is checked statically: each middleware's required context must be
available and context keys cannot be replaced. A stored sequence uses
`as const`; a tuple literal passed directly as `middlewares` does not need it.
The route contract must declare every middleware error status. Non-success
response schemas are checked at compile time and at runtime for RFC 7807
compatibility; an invalid response falls back to `500`.

### Success responses and headers

Declare response headers with a Zod object on the response wrapper. The mapper
returns schema **input** values; the adapter validates the selected status,
body and headers and sends the transformed schema **output** values. A contract
violation returns an RFC 7807 `500` before success status or headers are set.
For a branded value-object header whose output is compatible with its input,
the mapper must supply the branded value, not an arbitrary primitive. The same
domain-owned schema can be reused by the use case, the response body and the
header. Runtime validation still protects against forged values or bypassed
TypeScript checks. Schemas that transform between different input and output
types retain their Zod input type for the mapper. The OpenAPI generator documents
representable output schemas and reports opaque transforms; see its
[response-header documentation](../hexagonal-openapi/README.md#response-headers-and-body-less-responses).

```ts
const contract = defineRoute({
  method: "post",
  path: "/jobs",
  request: {},
  response: {
    200: z.object({ id: z.string() }),
    202: {
      schema: z.object({ taskId: z.string() }),
      headers: z.object({ "x-job-id": z.string() }),
    },
  },
});

mountFastifyRoute(app, {
  contract,
  inputMapper: () => ({}),
  useCase: async () => ok({ jobId: "job-1" }),
  outputMapper: (output) => ({
    status: 202,
    body: { taskId: output.jobId },
    headers: { "x-job-id": output.jobId },
  }),
});
```

For `204` and redirects omit `body`. A redirect entry uses `redirect: true` and
requires a nonempty string Location on the wire. An explicit mapper supplies
the declared Location schema's input type, which may transform into that string;
without a declared schema the input is a string. The default redirect accepts
only a nonempty string use-case output and still validates it against the
declared schema. Header names are matched without case at runtime. Optional
custom headers do not prevent the single-success default. Plain Zod body
schemas remain supported as response entries.

## Architecture decisions

- [ADR 0001 — Complete HTTP response mapping](docs/adr/0001-complete-http-response-output-mapper.md)

## Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `pnpm build`         | Dual ESM + CJS build (tsdown)  |
| `pnpm typecheck`     | Type-check without emitting    |
| `pnpm lint`          | ESLint autofix                 |
| `pnpm test`          | Run tests with Vitest          |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm clean`         | Remove `dist/`                 |
