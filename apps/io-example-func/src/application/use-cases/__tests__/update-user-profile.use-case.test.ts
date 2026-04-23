import { EmailAddressSchema, FiscalCodeSchema } from "@pagopa/io-core-domain";
import { GenericError, NotFoundError } from "@pagopa/io-core-domain/errors";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { UserProfile } from "../../../domain/entities/user-profile.entity.js";
import type { IUserProfileRepository } from "../../../domain/ports/outbound/persistence/user-profile.repository.js";

import { makeUpdateUserProfileUseCase } from "../update-user-profile.use-case.js";

const mockProfile: UserProfile = {
  birthDate: new Date("1985-08-01"),
  createdAt: new Date("2026-01-15T10:00:00.000Z"),
  email: EmailAddressSchema.parse("mario.rossi@example.com"),
  fiscalCode: FiscalCodeSchema.parse("RSSMRA85M01H501U"),
  name: "Mario Rossi",
};

const updatedProfile: UserProfile = {
  ...mockProfile,
  email: EmailAddressSchema.parse("mario.new@example.com"),
  updatedAt: new Date("2026-04-09T12:00:00.000Z"),
};

const makeMockRepository = (
  overrides: Partial<IUserProfileRepository> = {},
): IUserProfileRepository => ({
  create: vi.fn(),
  delete: vi.fn(),
  findByFiscalCode: vi.fn(),
  update: vi.fn().mockResolvedValue(ok(updatedProfile)),
  ...overrides,
});

describe("makeUpdateUserProfileUseCase", () => {
  it("should update the profile with new data", async () => {
    const repository = makeMockRepository();
    const useCase = makeUpdateUserProfileUseCase(repository);

    const result = await useCase({
      email: EmailAddressSchema.parse("mario.new@example.com"),
      fiscalCode: FiscalCodeSchema.parse("RSSMRA85M01H501U"),
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
      fiscalCode: FiscalCodeSchema.parse("AAAAAA00A00A000A"),
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
      email: EmailAddressSchema.parse("mario.new@example.com"),
      fiscalCode: FiscalCodeSchema.parse("RSSMRA85M01H501U"),
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
