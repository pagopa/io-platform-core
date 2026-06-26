import type { FastifyRequest } from "fastify";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createFastifyRequestValidator,
  fastifyExtractPayload,
} from "../validator/fastifyRequestValidator.js";

const asRequest = (parts: Partial<FastifyRequest>): FastifyRequest =>
  parts as unknown as FastifyRequest;

describe("fastifyExtractPayload", () => {
  it("maps a fastify request onto the canonical payload (path from params)", () => {
    const payload = fastifyExtractPayload(
      asRequest({
        body: { a: 1 },
        headers: { h: "v" },
        params: { id: "123" },
        query: { q: "x" },
      }),
    );

    expect(payload).toEqual({
      body: { a: 1 },
      headers: { h: "v" },
      path: { id: "123" },
      query: { q: "x" },
    });
  });

  it("defaults a missing body to an empty object", () => {
    const payload = fastifyExtractPayload(
      asRequest({ headers: {}, params: {}, query: {} }),
    );

    expect(payload.body).toEqual({});
  });
});

describe("createFastifyRequestValidator", () => {
  const validator = createFastifyRequestValidator(
    z.object({ path: z.object({ id: z.string() }) }),
  );

  it("returns the validated value on success", async () => {
    const result = await validator(asRequest({ params: { id: "abc" } }));

    expect(result._unsafeUnwrap()).toEqual({ path: { id: "abc" } });
  });

  it("returns a ValidationError on failure", async () => {
    const result = await validator(asRequest({ params: {} }));

    expect(result.isErr()).toBe(true);
  });
});
