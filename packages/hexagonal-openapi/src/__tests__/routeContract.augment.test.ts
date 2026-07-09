import { defineRoute } from "@pagopa/hexagonal-core/adapters";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// These tests document the module augmentation applied by importing
// `@pagopa/hexagonal-openapi`: core's minimal `RouteContract` gains the OpenAPI
// documentation metadata. The `@ts-expect-error` lines are compile-time
// assertions enforced by `tsc --noEmit` (the `typecheck` script).
describe("RouteContract OpenAPI augmentation", () => {
  it("accepts OpenAPI metadata (operationId, summary, tags) on a contract", () => {
    const contract = defineRoute({
      method: "get",
      operationId: "getThing",
      path: "/things/{id}",
      request: { path: z.object({ id: z.string() }) },
      response: { 200: z.object({ id: z.string() }) },
      summary: "Get a thing",
      tags: ["things"],
    });

    expect(contract.operationId).toBe("getThing");
    expect(contract.summary).toBe("Get a thing");
    expect(contract.tags).toEqual(["things"]);
  });

  it("still rejects arbitrary properties not declared on the contract", () => {
    const contract = defineRoute({
      // @ts-expect-error - `foo` is not part of the (augmented) RouteContract
      foo: "bar",
      method: "get",
      operationId: "getThing",
      path: "/things/{id}",
      request: { path: z.object({ id: z.string() }) },
      response: { 200: z.object({ id: z.string() }) },
    });

    expect(contract.operationId).toBe("getThing");
  });

  it("requires operationId once the OpenAPI augmentation is active", () => {
    const contract = defineRoute(
      // @ts-expect-error - `operationId` is required by the OpenAPI augmentation
      {
        method: "get",
        path: "/things/{id}",
        request: {},
        response: { 200: z.object({ id: z.string() }) },
      },
    );

    expect(contract.method).toBe("get");
  });
});
