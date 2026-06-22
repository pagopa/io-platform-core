// Public entry point for `@pagopa/hexagonal-core`.
//
// Re-exports both the shared domain primitives (errors, value objects, inbound
// ports) and the framework-agnostic adapter primitives (error mapper, output
// formatter, input validator helpers). Sub-path entry points are also available:
//   - "@pagopa/hexagonal-core/domain/errors"
//   - "@pagopa/hexagonal-core/domain/value-objects"
//   - "@pagopa/hexagonal-core/domain/ports"
//   - "@pagopa/hexagonal-core/adapters"
export * from "./adapters/index.js";
export * from "./domain/index.js";
