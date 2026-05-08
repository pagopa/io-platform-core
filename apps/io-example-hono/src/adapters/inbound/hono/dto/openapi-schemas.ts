import {
  EmailAddressSchema,
  FiscalCodeSchema,
  NonEmptyStringSchema,
} from "@pagopa/io-core-domain";
import { z } from "@hono/zod-openapi";

export const FiscalCodeOpenApi = FiscalCodeSchema.openapi("FiscalCode", {
  description: "The Italian fiscal code (Codice Fiscale).",
  example: "RSSMRA85M01H501U",
});

export const EmailAddressOpenApi = EmailAddressSchema.openapi("EmailAddress", {
  description: "A valid email address.",
  example: "mario.rossi@example.com",
  format: "email",
});

export const NonEmptyStringOpenApi = NonEmptyStringSchema.openapi({
  description: "A non-empty string.",
  example: "Mario Rossi",
});

const isoDateField = z
  .date()
  .transform((d) => d.toISOString().split("T")[0] as string)
  .openapi({
    description: "ISO 8601 date (YYYY-MM-DD).",
    format: "date",
    type: "string",
  });

const isoDateTimeField = z
  .date()
  .transform((d) => d.toISOString())
  .openapi({
    description: "ISO 8601 date-time.",
    format: "date-time",
    type: "string",
  });

export const UserProfileResponseSchema = z
  .object({
    birthDate: isoDateField,
    createdAt: isoDateTimeField,
    email: EmailAddressOpenApi,
    fiscalCode: FiscalCodeOpenApi,
    name: NonEmptyStringOpenApi,
    updatedAt: isoDateTimeField.optional(),
  })
  .openapi("UserProfile", {
    description: "A user profile with personal information.",
  });

export const CreateUserProfileBodySchema = z
  .object({
    birthDate: z
      .string()
      .date()
      .transform((s) => new Date(s))
      .openapi({
        description: "The user's date of birth (YYYY-MM-DD).",
        example: "1985-08-01",
        format: "date",
        type: "string",
      }),
    email: EmailAddressOpenApi,
    fiscalCode: FiscalCodeOpenApi,
    name: NonEmptyStringOpenApi,
  })
  .openapi("CreateUserProfileRequest", {
    description: "Request body for creating a user profile.",
  });

export const UpdateUserProfileBodySchema = z
  .object({
    email: EmailAddressOpenApi.optional(),
    name: NonEmptyStringOpenApi.optional(),
  })
  .openapi("UpdateUserProfileRequest", {
    description:
      "Request body for updating a user profile. At least one field should be provided.",
  });

export const FiscalCodeHeaderSchema = z.object({
  "x-fiscal-code": FiscalCodeOpenApi,
});

export const InfoOutputSchema = z
  .object({
    name: z.string().openapi({
      description: "The application name.",
      example: "io-example-hono",
    }),
    ok: z.boolean().openapi({
      description: "Whether the application is healthy.",
      example: true,
    }),
    version: z
      .string()
      .openapi({ description: "The application version.", example: "0.0.1" }),
  })
  .openapi("InfoOutput", {
    description: "Application health and version information.",
  });

export const ProblemDetailsSchema = z
  .object({
    detail: z.string().openapi({
      description: "Human-readable explanation.",
      example: "Resource not found.",
    }),
    status: z
      .number()
      .int()
      .openapi({ description: "HTTP status code.", example: 404 }),
    title: z.string().openapi({
      description: "Short, human-readable summary.",
      example: "Not Found",
    }),
    type: z.string().url().openapi({
      description: "URI reference identifying the problem type.",
      example: "https://ioapp.it/problems/not-found",
    }),
  })
  .openapi("ProblemDetails", {
    description: "RFC 7807 Problem Details.",
  });
