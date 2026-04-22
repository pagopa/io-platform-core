import type { EmailAddress, FiscalCode } from "@pagopa/io-core-domain";

import { ConflictError, NotFoundError } from "@pagopa/io-core-domain/errors";
import { err, ok } from "neverthrow";

import type { UserProfile } from "../../../domain/entities/user-profile.entity.js";
import type {
  IUserProfileRepository,
  NewUserProfile,
} from "../../../domain/ports/outbound/persistence/user-profile.repository.js";

const seedData = new Map<string, UserProfile>([
  [
    "RSSMRA85M01H501U",
    {
      birthDate: new Date("1985-08-01"),
      createdAt: "2026-01-15T10:00:00.000Z",
      email: "mario.rossi@example.com" as EmailAddress,
      fiscalCode: "RSSMRA85M01H501U" as FiscalCode,
      name: "Mario Rossi",
    },
  ],
  [
    "VRDLGI90A01F205X",
    {
      birthDate: new Date("1990-01-01"),
      createdAt: "2026-02-20T14:30:00.000Z",
      email: "luigi.verdi@example.com" as EmailAddress,
      fiscalCode: "VRDLGI90A01F205X" as FiscalCode,
      name: "Luigi Verdi",
    },
  ],
]);

export class InMemoryUserProfileRepository implements IUserProfileRepository {
  private readonly store = new Map<string, UserProfile>(seedData);

  async create(profile: NewUserProfile) {
    const key = profile.fiscalCode as string;
    if (this.store.has(key)) {
      return err(
        new ConflictError(
          `UserProfile with fiscal code '${key}' already exists.`,
        ),
      );
    }
    const newProfile: UserProfile = {
      ...profile,
      createdAt: new Date().toISOString(),
    };
    this.store.set(key, newProfile);
    return ok(newProfile);
  }

  async delete(fiscalCode: FiscalCode) {
    const key = fiscalCode as string;
    const existing = this.store.get(key);
    if (!existing) {
      return err(new NotFoundError("UserProfile", key));
    }
    this.store.delete(key);
    return ok(existing);
  }

  async findByFiscalCode(fiscalCode: FiscalCode) {
    const profile = this.store.get(fiscalCode as string);
    if (!profile) {
      return err(new NotFoundError("UserProfile", fiscalCode as string));
    }
    return ok(profile);
  }

  async update(
    fiscalCode: FiscalCode,
    data: { email?: EmailAddress; name?: string },
  ) {
    const key = fiscalCode as string;
    const existing = this.store.get(key);
    if (!existing) {
      return err(new NotFoundError("UserProfile", key));
    }
    const updated: UserProfile = {
      ...existing,
      ...(data.email !== undefined && { email: data.email }),
      ...(data.name !== undefined && { name: data.name }),
      updatedAt: new Date().toISOString(),
    };
    this.store.set(key, updated);
    return ok(updated);
  }
}
