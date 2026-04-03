import { NotFoundError } from "@pagopa/io-core-domain/errors";
import { describe, expect, it } from "vitest";

import { InMemoryGreetingRepository } from "../in-memory-greeting.repository.js";

describe("InMemoryGreetingRepository", () => {
  const repository = new InMemoryGreetingRepository();

  it("should return a greeting for a known name (case insensitive)", async () => {
    const result = await repository.getByName("World");

    expect(result.isOk()).toBe(true);
    const greeting = result._unsafeUnwrap();
    expect(greeting.message).toBe("Hello, World!");
    expect(greeting.timestamp).toBeDefined();
  });

  it("should return a greeting for 'io'", async () => {
    const result = await repository.getByName("io");

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().message).toBe("Welcome to the IO Platform!");
  });

  it("should return NotFoundError for an unknown name", async () => {
    const result = await repository.getByName("nonexistent");

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });
});
