import { z } from "zod";

const dateToTimestampSchema = z.date().transform((date) => date.getTime());

/**
 * Response schema for the UserProfile entity, used to validate and format the output.
 */
export const UserProfileResponseSchema = z.object({
  birthDate: dateToTimestampSchema,
  createdAt: dateToTimestampSchema,
  email: z.string(),
  fiscalCode: z.string(),
  name: z.string(),
  updatedAt: dateToTimestampSchema.optional(),
});
