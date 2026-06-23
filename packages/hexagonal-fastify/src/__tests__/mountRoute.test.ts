import { defineRoute, ProblemJson } from "@pagopa/hexagonal-core/adapters";
import { NotFoundError } from "@pagopa/hexagonal-core/domain/errors";
import Fastify from "fastify";
import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { mountFastifyRoute } from "../mountRoute.js";

const UserSchema = z.object({ id: z.string(), name: z.string() });

const getUserContract = defineRoute({
  method: "get",
  operationId: "getUser",
  path: "/users/{id}",
  request: { path: z.object({ id: z.string() }) },
  response: { 200: UserSchema, 404: ProblemJson },
});

const mountGetUser = (app: ReturnType<typeof Fastify>): void => {
  mountFastifyRoute(app, {
    contract: getUserContract,
    transformInput: (req) => ({ id: req.path.id }),
    useCase: async (input: { id: string }) =>
      input.id === "1"
        ? ok({ id: "1", name: "Alice" })
        : err(new NotFoundError("User", input.id)),
  });
};

describe("mountFastifyRoute", () => {
  it("mounts the route and returns the formatted success body", async () => {
    const app = Fastify();
    mountGetUser(app);

    const res = await app.inject({ method: "GET", url: "/users/1" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ id: "1", name: "Alice" });

    await app.close();
  });

  it("converts OpenAPI path params and maps domain errors to problem+json", async () => {
    const app = Fastify();
    mountGetUser(app);

    const res = await app.inject({ method: "GET", url: "/users/999" });

    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.json().title).toBe("Not Found");

    await app.close();
  });
});
