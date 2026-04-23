import { z } from "zod";

export const UserProfileResponseSchema = z.object({
  birthDate: z.date().transform((date) => date.getTime()),
  createdAt: z.date().transform((date) => date.getTime()),
  email: z.string(),
  fiscalCode: z.string(),
  updatedAt: z
    .date()
    .optional()
    .transform((date) => date?.getTime()),
});
