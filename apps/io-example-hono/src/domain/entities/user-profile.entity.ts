import {
  EmailAddressSchema,
  FiscalCodeSchema,
  NonEmptyStringSchema,
} from "@pagopa/io-core-domain";
import { UnprocessableEntityError } from "@pagopa/io-core-domain/errors";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";

export const NewUserProfileSchema = z.object({
  birthDate: z.date(),
  email: EmailAddressSchema,
  fiscalCode: FiscalCodeSchema,
  name: NonEmptyStringSchema,
});
export type NewUserProfile = z.infer<typeof NewUserProfileSchema>;

export const UserProfileSchema = NewUserProfileSchema.extend({
  createdAt: z.date(),
  updatedAt: z.date().optional(),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const validateAdultAge = (
  birthDate: Date,
): Result<void, UnprocessableEntityError> => {
  const limit = new Date();
  limit.setFullYear(limit.getFullYear() - 18);
  if (birthDate > limit) {
    return err(
      new UnprocessableEntityError("User must be at least 18 years old"),
    );
  }
  return ok(undefined);
};
