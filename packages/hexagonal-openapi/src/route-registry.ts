import type { ZodType } from "zod";

import type { AnyRouteContract } from "./generate.js";

/**
 * In-memory collection of route contracts and named component schemas, used to
 * feed the OpenAPI generator. This is the **only** home for OpenAPI registry
 * state; adapters (e.g. fastify) never touch it.
 */
export class RouteRegistry {
  private readonly contracts: AnyRouteContract[] = [];
  private readonly schemaIds = new Set<string>();
  private readonly schemas: ZodType[] = [];

  /** Registers a route contract for inclusion in the generated document. */
  add(contract: AnyRouteContract): void {
    this.contracts.push(contract);
  }

  /**
   * Registers a named schema (one carrying `.meta({ id })`) as a reusable
   * OpenAPI component. Schemas without an id, or with an already-seen id, are
   * silently ignored.
   */
  addSchema(schema: ZodType): void {
    const meta = (
      schema as { meta?: () => undefined | { id?: string } }
    ).meta?.();
    const id = meta?.id;
    if (id === undefined || this.schemaIds.has(id)) return;
    this.schemaIds.add(id);
    this.schemas.push(schema);
  }

  /** Returns all registered route contracts. */
  getAll(): readonly AnyRouteContract[] {
    return this.contracts;
  }

  /** Returns all registered named component schemas. */
  getSchemas(): readonly ZodType[] {
    return this.schemas;
  }
}
