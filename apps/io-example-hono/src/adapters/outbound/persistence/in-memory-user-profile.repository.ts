import {
  EmailAddressSchema,
  type FiscalCode,
  FiscalCodeSchema,
  NonEmptyStringSchema,
} from "@pagopa/io-core-domain";
import { ConflictError, NotFoundError } from "@pagopa/io-core-domain/errors";
import { err, ok } from "neverthrow";

import type {
  NewUserProfile,
  UserProfile,
} from "../../../domain/entities/user-profile.entity.js";
import type { IUserProfileRepository } from "../../../domain/ports/outbound/persistence/user-profile.repository.js";

const seedData = new Map<string, UserProfile>([
  [
    "RSSMRA85M01H501U",
    {
      birthDate: new Date("1985-08-01"),
      createdAt: new Date("2026-01-15"),
      email: EmailAddressSchema.parse("mario.rossi@example.com"),
      fiscalCode: FiscalCodeSchema.parse("RSSMRA85M01H501U"),
      name: NonEmptyStringSchema.parse("Mario Rossi"),
    },
  ],
  [
    "VRDLGI90A01F205X",
    {
      birthDate: new Date("1990-01-01"),
      createdAt: new Date("2026-02-20"),
      email: EmailAddressSchema.parse("luigi.verdi@example.com"),
      fiscalCode: FiscalCodeSchema.parse("VRDLGI90A01F205X"),
      name: NonEmptyStringSchema.parse("Luigi Verdi"),
    },
  ],
]);

export class InMemoryUserProfileRepository implements IUserProfileRepository {
  private readonly store = new Map<string, UserProfile>(seedData);

  async create(newProfile: NewUserProfile) {
    const key = newProfile.fiscalCode;
    if (this.store.has(key))
      return err(
        new ConflictError(
          `UserProfile with fiscal code '${key}' already exists.`,
        ),
      );
    const profileToStore: UserProfile = {
      ...newProfile,
      createdAt: new Date(),
    };
    this.store.set(key, profileToStore);
    return ok(profileToStore);
  }

  async delete(fiscalCode: FiscalCode) {
    const existing = this.store.get(fiscalCode);
    if (!existing) return err(new NotFoundError("UserProfile", fiscalCode));
    this.store.delete(fiscalCode);
    return ok(existing);
  }

  async findByFiscalCode(fiscalCode: FiscalCode) {
    const profile = this.store.get(fiscalCode);
    if (!profile) return err(new NotFoundError("UserProfile", fiscalCode));
    return ok(profile);
  }

  async update(
    fiscalCode: FiscalCode,
    data: Partial<Pick<UserProfile, "email" | "name">>,
  ) {
    const existing = this.store.get(fiscalCode);
    if (!existing) return err(new NotFoundError("UserProfile", fiscalCode));
    const updated: UserProfile = {
      ...existing,
      ...(data.email !== undefined && { email: data.email }),
      ...(data.name !== undefined && { name: data.name }),
      updatedAt: new Date(),
    };
    this.store.set(fiscalCode, updated);
    return ok(updated);
  }
}
