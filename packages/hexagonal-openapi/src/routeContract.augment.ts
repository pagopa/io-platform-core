import type {
  ResponseMap,
  RouteRequestSchemas,
} from "@pagopa/hexagonal-core/adapters";

// Module augmentation — the explicit type override that widens core's minimal
// `RouteContract` with the OpenAPI documentation metadata. Because this file is
// part of `@pagopa/hexagonal-openapi`, merely importing the package pulls the
// augmentation into the consumer's program: every route contract then also
// accepts `operationId` (required) plus the optional `description`, `summary`,
// `tags` and `security`. Projects that never import this package keep the
// minimal, runtime-only contract. The augmenting interface must repeat core's
// exact type parameters and constraints for the declaration merge to apply.
declare module "@pagopa/hexagonal-core/adapters" {
  interface RouteContract<
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Req extends RouteRequestSchemas,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    Resp extends ResponseMap,
  > {
    /** Operation description rendered in the generated OpenAPI document. */
    description?: string;
    /** Unique OpenAPI operation identifier. */
    operationId: string;
    /** OpenAPI security requirements for the operation. */
    security?: readonly Readonly<Record<string, readonly string[]>>[];
    /** Short operation summary rendered in the generated OpenAPI document. */
    summary?: string;
    /** OpenAPI tags used to group operations. */
    tags?: readonly string[];
  }
}
