# @pagopa/hexagonal-openapi

Code-first OpenAPI toolkit for the IO platform. Declare HTTP routes as
framework-agnostic **contracts** built from [Zod](https://zod.dev) schemas, then
generate an OpenAPI 3.1 document from them. Framework adapters (e.g.
`@pagopa/hexagonal-fastify`) consume the contract types but never generate the
spec; pass the same contracts to this package to produce the OpenAPI document.

## Installation

```sh
pnpm add @pagopa/hexagonal-openapi zod
```

`zod` is a peer dependency. `defineRoute` and the minimal, runtime-only
`RouteContract`, plus the RFC 7807 `ProblemJson` schema, live in
`@pagopa/hexagonal-core/adapters`.

## What's inside

- **Contracts** — `defineRoute`, `RouteContract`, `ResponseMap`, `WireRequest`,
  `EnsureResponseCoversErrors`, `SuccessSchemaFromMap`, … live in
  [`@pagopa/hexagonal-core/adapters`](../hexagonal-core); this package consumes
  them (compile-time safety). Importing this package **augments** core's
  minimal `RouteContract` (via `declare module`) with the OpenAPI-only
  documentation metadata: `operationId` (required) plus optional `description`,
  `summary`, `tags` and `security`. So the extra fields become available on
  every contract in a project that generates an OpenAPI document, while a
  project that only mounts routes keeps the minimal contract. `defineRoute`
  stays strict either way — properties not declared on the (possibly augmented)
  contract are a compile-time error.
- **Generator** — `buildOpenApiDocument` produces an OpenAPI 3.1 document from a
  list of route contracts. Schemas carrying `.meta({ id })` are auto-registered
  as reusable components and referenced via `$ref`.
- **Component escape hatch** — `registerComponents` gives you the underlying
  `OpenAPIRegistry` from `@asteasolutions/zod-to-openapi` for advanced cases
  such as security schemes, parameters, or explicit named-schema registration.
- **YAML** — `openApiToYaml` serializes a document to YAML;
  `writeOpenApiYaml` writes it to disk (or checks it in CI with `check: true`).

## Usage

```ts
import { defineRoute, ProblemJson } from "@pagopa/hexagonal-core/adapters";
import {
  buildOpenApiDocument,
  openApiToYaml,
} from "@pagopa/hexagonal-openapi";
import { z } from "zod";

const UserSchema = z.object({ id: z.string(), name: z.string() }).meta({
  id: "User",
});

const getUser = defineRoute({
  method: "get",
  operationId: "getUser",
  path: "/users/{id}",
  request: { path: z.object({ id: z.string() }) },
  response: {
    200: UserSchema,
    404: ProblemJson,
  },
});

const document = buildOpenApiDocument({
  document: { info: { title: "Users API", version: "1.0.0" } },
  routes: [getUser],
});

console.log(openApiToYaml(document));
```

### Registering additional components

Use `registerComponents` when you need to register security schemes, parameters,
or schemas that are not reachable from any route response:

```ts
import { buildOpenApiDocument, OpenAPIRegistry } from "@pagopa/hexagonal-openapi";

const document = buildOpenApiDocument({
  document: {
    info: { title: "Users API", version: "1.0.0" },
  },
  registerComponents: (registry: OpenAPIRegistry) => {
    registry.registerComponent("securitySchemes", "bearerAuth", {
      scheme: "bearer",
      type: "http",
    });
  },
  routes: [getUser],
});
```

### Writing YAML to disk

```ts
import { writeOpenApiYaml } from "@pagopa/hexagonal-openapi";

const result = await writeOpenApiYaml({
  doc: document,
  path: "./openapi.yaml",
});

// result.kind is "ok" | "unchanged" | "check-failed"
```

In CI, use `check: true` to fail when the committed spec is out of date:

```ts
const result = await writeOpenApiYaml({
  check: true,
  doc: document,
  path: "./openapi.yaml",
});

if (result.kind === "check-failed") {
  console.error(result.diff);
  process.exit(1);
}
```

## API reference

### `buildOpenApiDocument(options: GenerateOptions)`

Builds an OpenAPI 3.1 document from route contracts.

```ts
interface GenerateOptions {
  document: OpenApiTopLevelConfig;
  registerComponents?: (registry: OpenAPIRegistry) => void;
  routes: readonly AnyRouteContract[];
}
```

- `document` — top-level metadata (`info`, `servers`, …). `openapi: "3.1.0"` is
  set automatically.
- `routes` — the route contracts to expose.
- `registerComponents` — optional hook to register extra components on the
  underlying `OpenAPIRegistry`.

### `openApiToYaml(doc: unknown): string`

Serializes a document to a stable YAML string.

### `writeOpenApiYaml(options: WriteOptions): Promise<WriteResult>`

Writes YAML to disk, or checks it when `check: true`.

```ts
interface WriteOptions {
  check?: boolean;
  doc: unknown;
  path: string;
}

type WriteResult =
  | { diff: string; kind: "check-failed"; path: string }
  | { kind: "ok"; path: string }
  | { kind: "unchanged"; path: string };
```

### `collectNamedSchemas(root: ZodType): readonly ZodType[]`

Recursively collects every Zod schema that carries `.meta({ id })` from a schema
 tree. Useful with `registerComponents` to register named components explicitly.

### `readSchemaId(schema: ZodType): string | undefined`

Reads the `.meta({ id })` annotation of a schema, if any.

### `AnyRouteContract`

A type alias for a `RouteContract` with erased generic parameters. Heterogeneous
arrays of contracts can be typed as `readonly AnyRouteContract[]`.

### `OpenAPIRegistry`

Re-exported from `@asteasolutions/zod-to-openapi`. Use it inside
`registerComponents` for advanced component registration.

## Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `pnpm build`         | Dual ESM + CJS build (tsdown)  |
| `pnpm typecheck`     | Type-check without emitting    |
| `pnpm lint`          | ESLint autofix                 |
| `pnpm test`          | Run tests with Vitest          |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm clean`         | Remove `dist/`                 |
