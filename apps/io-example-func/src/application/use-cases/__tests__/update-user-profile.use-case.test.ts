import type { EmailAddress, FiscalCode } from "@pagopa/io-core-domain";

import { GenericError, NotFoundError } from "@pagopa/io-core-domain/errors";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { UserProfile } from "../../../domain/entities/user-profile.entity.js";
import type { IUserProfileRepository } from "../../../domain/ports/outbound/persistence/user-profile.repository.js";

import { makeUpdateUserProfileUseCase } from "../update-user-profile.use-case.js";

const mockProfile: UserProfile = {
  createdAt: "2026-01-15T10:00:00.000Z",
  email: "mario.rossi@example.com" as EmailAddress,
  fiscalCode: "RSSMRA85M01H501U" as FiscalCode,
  name: "Mario Rossi",
};

const updatedProfile: UserProfile = {
  ...mockProfile,
  email: "mario.new@example.com" as EmailAddress,
  updatedAt: "2026-04-09T12:00:00.000Z",
};

const makeMockRepository = (
  overrides: Partial<IUserProfileRepository> = {},
): IUserProfileRepository => ({
  create: vi.fn(),
  findByFiscalCode: vi.fn(),
  update: vi.fn().mockResolvedValue(ok(updatedProfile)),
  ...overrides,
});

describe("makeUpdateUserProfileUseCase", () => {
  it("should update the profile with new data", async () => {
    const repository = makeMockRepository();
    const useCase = makeUpdateUserProfileUseCase(repository);

    const result = await useCase({
      email: "mario.new@example.com" as EmailAddress,
      fiscalCode: "RSSMRA85M01H501U" as FiscalCode,
    });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap().email).toBe("mario.new@example.com");
    expect(repository.update).toHaveBeenCalledWith("RSSMRA85M01H501U", {
      email: "mario.new@example.com",
      name: undefined,
    });
  });

  it("should return NotFoundError when profile does not exist", async () => {
    const repository = makeMockRepository({
      update: vi
        .fn()
        .mockResolvedValue(
          err(new NotFoundError("UserProfile", "AAAAAA00A00A000A")),
        ),
    });
    const useCase = makeUpdateUserProfileUseCase(repository);

    const result = await useCase({
      fiscalCode: "AAAAAA00A00A000A" as FiscalCode,
      name: "New Name",
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(NotFoundError);
  });

  it("should propagate GenericError from the repository", async () => {
    const repository = makeMockRepository({
      update: vi.fn().mockResolvedValue(err(new GenericError("db failure"))),
    });
    const useCase = makeUpdateUserProfileUseCase(repository);

    const result = await useCase({
      email: "mario.new@example.com" as EmailAddress,
      fiscalCode: "RSSMRA85M01H501U" as FiscalCode,
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
