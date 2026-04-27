import { EmailAddressSchema, FiscalCodeSchema } from "@pagopa/io-core-domain";
import { ConflictError, GenericError } from "@pagopa/io-core-domain/errors";
import { err, ok } from "neverthrow";
import { describe, expect, it, vi } from "vitest";

import type { IUserProfileRepository } from "../../../domain/ports/outbound/persistence/user-profile.repository.js";

import { NewUserProfile } from "../../../domain/entities/user-profile.entity.js";
import { makeCreateUserProfileUseCase } from "../create-user-profile.use-case.js";

const makeMockRepository = (
  overrides: Partial<IUserProfileRepository> = {},
): IUserProfileRepository => ({
  create: vi
    .fn()
    .mockImplementation(async (profile: NewUserProfile) =>
      ok({ ...profile, createdAt: new Date() }),
    ),
  delete: vi.fn(),
  findByFiscalCode: vi.fn(),
  update: vi.fn(),
  ...overrides,
});

describe("makeCreateUserProfileUseCase", () => {
  it("should create a profile with a createdAt timestamp", async () => {
    const repository = makeMockRepository();
    const useCase = makeCreateUserProfileUseCase(repository);

    const result = await useCase({
      birthDate: new Date("1985-08-01"),
      email: EmailAddressSchema.parse("mario.rossi@example.com"),
      fiscalCode: FiscalCodeSchema.parse("RSSMRA85M01H501U"),
      name: "Mario Rossi",
    });

    expect(result.isOk()).toBe(true);
    const profile = result._unsafeUnwrap();
    expect(profile.fiscalCode).toBe("RSSMRA85M01H501U");
    expect(profile.email).toBe("mario.rossi@example.com");
    expect(profile.name).toBe("Mario Rossi");
    expect(profile.createdAt).toBeDefined();
  });

  it("should return ConflictError when profile already exists", async () => {
    const repository = makeMockRepository({
      create: vi
        .fn()
        .mockResolvedValue(
          err(new ConflictError("UserProfile already exists.")),
        ),
    });
    const useCase = makeCreateUserProfileUseCase(repository);

    const result = await useCase({
      birthDate: new Date("1985-08-01"),
      email: EmailAddressSchema.parse("mario.rossi@example.com"),
      fiscalCode: FiscalCodeSchema.parse("RSSMRA85M01H501U"),
      name: "Mario Rossi",
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(ConflictError);
  });

  it("should propagate GenericError from the repository", async () => {
    const repository = makeMockRepository({
      create: vi.fn().mockResolvedValue(err(new GenericError("db failure"))),
    });
    const useCase = makeCreateUserProfileUseCase(repository);

    const result = await useCase({
      birthDate: new Date("1985-08-01"),
      email: EmailAddressSchema.parse("mario.rossi@example.com"),
      fiscalCode: FiscalCodeSchema.parse("RSSMRA85M01H501U"),
      name: "Mario Rossi",
    });

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(GenericError);
  });
});
