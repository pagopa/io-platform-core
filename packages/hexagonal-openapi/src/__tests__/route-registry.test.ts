import { describe, expect, it } from "vitest";
import { z } from "zod";

import type { AnyRouteContract } from "../generate.js";

import { RouteRegistry } from "../route-registry.js";

const contract = {
  method: "get",
  operationId: "op",
  path: "/x",
  request: {},
  response: { 200: z.object({}) },
} as unknown as AnyRouteContract;

describe("RouteRegistry", () => {
  it("stores and returns route contracts", () => {
    const registry = new RouteRegistry();

    registry.add(contract);

    expect(registry.getAll()).toHaveLength(1);
  });

  it("registers a named schema once and ignores duplicate ids", () => {
    const registry = new RouteRegistry();

    registry.addSchema(z.object({ id: z.string() }).meta({ id: "Thing" }));
    registry.addSchema(z.object({ id: z.string() }).meta({ id: "Thing" }));

    expect(registry.getSchemas()).toHaveLength(1);
  });

  it("ignores schemas without a meta id", () => {
    const registry = new RouteRegistry();

    registry.addSchema(z.string());

    expect(registry.getSchemas()).toHaveLength(0);
  });
});
