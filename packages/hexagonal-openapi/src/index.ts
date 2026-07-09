// Public entry point for `@pagopa/hexagonal-openapi`.
//
// Exposes the code-first OpenAPI toolkit: the route registry (the single home
// for OpenAPI registry state) and the OpenAPI 3.1 generator + YAML serializer.
//
// `defineRoute`, `RouteContract`, `ResponseMap`, `WireRequest`, … live in
// `@pagopa/hexagonal-core/adapters`; import them from there. Importing this
// package also augments core's `RouteContract` (see `./routeContract.augment`)
// with the OpenAPI-only documentation metadata — `operationId` (required) plus
// optional `description`/`summary`/`tags`/`security` — so contracts declared in
// a project that generates an OpenAPI document accept those fields, while
// projects that only mount routes never see them. The domain-error HTTP
// metadata (`errorMetadata`, …) and the RFC 7807 `ProblemJson` /
// `ProblemDetailsSchema` also live in `@pagopa/hexagonal-core/adapters`.
import "./routeContract.augment.js";

export {
  type AnyRouteContract,
  buildOpenApiDocument,
  collectNamedSchemas,
  type GenerateOptions,
  readSchemaId,
} from "./generate.js";
export {
  openApiToYaml,
  writeOpenApiYaml,
  type WriteOptions,
  type WriteResult,
} from "./yaml.js";

export { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
