// Adapter barrel: framework-agnostic primitives shared by concrete adapters.
// Concrete, framework-specific adapters (fastify, azure-functions, …) live in
// their own packages and build on top of these.
export * from "./error-mapper/index.js";
export * from "./formatter/index.js";
export * from "./http-responses/index.js";
export * from "./middleware/index.js";
export * from "./route-contract/index.js";
export * from "./validator/index.js";
