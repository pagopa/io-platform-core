// Public entry point for `@pagopa/hexagonal-fastify`.
//
// Fastify primary-adapter primitives that wire framework-agnostic use cases,
// validators and formatters (from `@pagopa/hexagonal-core`) onto Fastify, plus
// `mountFastifyRoute` which mounts a `@pagopa/hexagonal-core` route contract.
// Error mapping is delegated to the core error mapper (never re-implemented).
export {
  type ErrorResponderConfig,
  sendErrorResponse,
} from "./errorResponder.js";
export {
  createHttpHandler,
  type SuccessResponder,
  type SuccessStatusCode,
} from "./httpHandlerBuilder.js";
export { mountFastifyRoute } from "./mountRoute.js";
export {
  createFastifyRequestValidator,
  emptyValidator,
  fastifyExtractPayload,
  type HttpRequestPayload,
} from "./validator/fastifyRequestValidator.js";

// Convenience re-exports of the core response primitives most often used
// alongside a Fastify adapter.
export {
  createHttpResponseFormatter,
  identityFormatter,
  ProblemJson,
} from "@pagopa/hexagonal-core/adapters";
