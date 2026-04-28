import { z } from "zod";

export const NonEmptyStringBrand = Symbol("NonEmptyString");

export const NonEmptyStringSchema = z
  .string()
  .min(1, "String cannot be empty")
  .brand<typeof NonEmptyStringBrand>();

export type NonEmptyString = z.infer<typeof NonEmptyStringSchema>;
