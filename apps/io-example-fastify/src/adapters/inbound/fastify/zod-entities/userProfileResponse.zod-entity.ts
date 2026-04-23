import { z } from "zod";
const dateToTimestampSchema = z
  .date()
  .transform((date) => date.toISOString().split("T")[0]);

/**
 * Response schema for the UserProfile entity, used to validate and format the output.
 */
export const UserProfileResponseSchema = z.object({
  birthDate: dateToTimestampSchema,
  email: z.string(),
  fiscalCode: z.string(),
  name: z.string(),
});
