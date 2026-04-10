import type { EmailAddress, FiscalCode } from "@pagopa/io-core-domain";

import { GenericError, NotFoundError } from "@pagopa/io-core-domain/errors";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { UserProfile } from "../../../domain/entities/user-profile.entity.js";
import type { IUserProfileRepository } from "../../../domain/ports/outbound/persistence/user-profile.repository.js";

import { makeGetUserProfileUseCase } from "../get-user-profile.use-case.js";

const mockProfile: UserProfile = {
  createdAt: "2026-01-15T10:00:00.000Z",
  email: "mario.rossi@example.com" as EmailAddress,
  fiscalCode: "RSSMRA85M01H501U" as FiscalCode,
  name: "Mario Rossi",
};

const makeMockRepository = (
  overrides: Partial<IUserProfileRepository> = {},
): IUserProfileRepository => ({
  create: vi.fn().mockResolvedValue(ok(mockProfile)),
  findByFiscalCode: vi.fn().mockResolvedValue(ok(mockProfile)),
  update: vi.fn().mockResolvedValue(ok(mockProfile)),
  ...overrides,
});

describe("makeGetUserProfileUseCase", () => {
  it("should return a profile when found by fiscal code", async () => {
    const repository = makeMockRepository();
    const useCase = makeGetUserProfileUseCase(repository);

    const result = await useCase({
      fiscalCode: "RSSMRA85M01H501U" as FiscalCode,
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual(mockProfile);
    expect(repository.findByFiscalCode).toHaveBeenCalledWith(
      "RSSMRA85M01H501U",
    );
  });

  it("should return NotFoundError when profile does not exist", async () => {
    const repository = makeMockRepository({
      findByFiscalCode: vi
        .fn()
        .mockResolvedValue(
          err(new NotFoundError("UserProfile", "AAAAAA00A00A000A")),
        ),
    });
    const useCase = makeGetUserProfileUseCase(repository);

    const result = await useCase({
      fiscalCode: "AAAAAA00A00A000A" as FiscalCode,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it("should propagate GenericError from the repository", async () => {
    const repository = makeMockRepository({
      findByFiscalCode: vi
        .fn()
        .mockResolvedValue(err(new GenericError("db failure"))),
    });
    const useCase = makeGetUserProfileUseCase(repository);

    const result = await useCase({
      fiscalCode: "RSSMRA85M01H501U" as FiscalCode,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
