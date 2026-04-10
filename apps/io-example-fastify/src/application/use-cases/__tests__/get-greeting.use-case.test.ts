import { GenericError, NotFoundError } from "@pagopa/io-core-domain/errors";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import { Greeting } from "../../../domain/entities/greeting.entity.js";
import { IGreetingRepository } from "../../../domain/ports/outbound/persistence/greeting.repository.js";
import { makeGetGreetingUseCase } from "../get-greeting.use-case.js";

const mockGreeting: Greeting = {
  message: "Hello, World!",
  timestamp: "2026-04-02T00:00:00.000Z",
};

const makeMockRepository = (
  overrides: Partial<IGreetingRepository> = {},
): IGreetingRepository => ({
  getByName: vi.fn().mockResolvedValue(ok(mockGreeting)),
  ...overrides,
});

describe("makeGetGreetingUseCase", () => {
  it("should return a greeting when the name is found", async () => {
    const repository = makeMockRepository();
    const useCase = makeGetGreetingUseCase(repository);

    const result = await useCase({ name: "world" });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(mockGreeting);
    expect(repository.getByName).toHaveBeenCalledWith("world");
  });

  it("should return NotFoundError when the name is not found", async () => {
    const repository = makeMockRepository({
      getByName: vi
        .fn()
        .mockResolvedValue(err(new NotFoundError("Greeting", "unknown"))),
    });
    const useCase = makeGetGreetingUseCase(repository);

    const result = await useCase({ name: "unknown" });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it("should propagate GenericError from the repository", async () => {
    const repository = makeMockRepository({
      getByName: vi.fn().mockResolvedValue(err(new GenericError("db failure"))),
    });
    const useCase = makeGetGreetingUseCase(repository);

    const result = await useCase({ name: "world" });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
