import type { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import type {
  FastifyBaseLogger,
  FastifyInstance,
  RawReplyDefaultExpression,
  RawRequestDefaultExpression,
  RawServerDefault,
} from "fastify";
import type { JSONSchema } from "json-schema-to-ts";

const FISCAL_CODE_PATTERN =
  "^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$";

export const FiscalCodeSchema = {
  $id: "FiscalCode",
  description: "The Italian fiscal code (Codice Fiscale).",
  pattern: FISCAL_CODE_PATTERN,
  type: "string",
} as const satisfies JSONSchema;

export const EmailAddressSchema = {
  $id: "EmailAddress",
  description: "A valid email address.",
  format: "email",
  type: "string",
} as const satisfies JSONSchema;

export const UserProfileSchema = {
  $id: "UserProfile",
  description: "A user profile with personal information.",
  properties: {
    birthDate: { format: "date", type: "string" },
    createdAt: { format: "date-time", type: "string" },
    email: { $ref: "EmailAddress#" },
    fiscalCode: { $ref: "FiscalCode#" },
    name: { type: "string" },
    updatedAt: { format: "date-time", type: "string" },
  },
  required: ["fiscalCode", "email", "name", "birthDate", "createdAt"],
  type: "object",
} as const satisfies JSONSchema;

export const CreateUserProfileRequestSchema = {
  $id: "CreateUserProfileRequest",
  description: "Request body for creating a user profile.",
  properties: {
    birthDate: { format: "date", type: "string" },
    email: { $ref: "EmailAddress#" },
    fiscalCode: { $ref: "FiscalCode#" },
    name: { minLength: 1, type: "string" },
  },
  required: ["fiscalCode", "email", "name", "birthDate"],
  type: "object",
} as const satisfies JSONSchema;

export const UpdateUserProfileRequestSchema = {
  $id: "UpdateUserProfileRequest",
  description:
    "Request body for updating a user profile. At least one field should be provided.",
  properties: {
    email: { $ref: "EmailAddress#" },
    name: { minLength: 1, type: "string" },
  },
  type: "object",
} as const satisfies JSONSchema;

export const ProblemDetailsSchema = {
  $id: "ProblemDetails",
  description: "RFC 7807 Problem Details for HTTP APIs.",
  properties: {
    detail: { type: "string" },
    status: { type: "integer" },
    title: { type: "string" },
    type: { format: "uri", type: "string" },
  },
  required: ["type", "title", "status", "detail"],
  type: "object",
} as const satisfies JSONSchema;

export const InfoOutputSchema = {
  $id: "InfoOutput",
  additionalProperties: false,
  description: "Application health and version information.",
  properties: {
    name: { type: "string" },
    ok: { type: "boolean" },
    version: { type: "string" },
  },
  required: ["name", "ok", "version"],
  type: "object",
} as const satisfies JSONSchema;

export type SharedSchemaReferences = [
  typeof FiscalCodeSchema,
  typeof EmailAddressSchema,
  typeof UserProfileSchema,
  typeof CreateUserProfileRequestSchema,
  typeof UpdateUserProfileRequestSchema,
  typeof ProblemDetailsSchema,
  typeof InfoOutputSchema,
];

export type TypedFastifyInstance = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  JsonSchemaToTsProvider<{
    ValidatorSchemaOptions: { references: SharedSchemaReferences };
    SerializerSchemaOptions: {
      references: SharedSchemaReferences;
      deserialize: [
        { pattern: { type: "string"; format: "date-time" }; output: Date },
        { pattern: { type: "string"; format: "date" }; output: Date },
      ];
    };
  }>
>;

export const registerSharedSchemas = (fastify: FastifyInstance): void => {
  fastify.addSchema(FiscalCodeSchema);
  fastify.addSchema(EmailAddressSchema);
  fastify.addSchema(UserProfileSchema);
  fastify.addSchema(CreateUserProfileRequestSchema);
  fastify.addSchema(UpdateUserProfileRequestSchema);
  fastify.addSchema(ProblemDetailsSchema);
  fastify.addSchema(InfoOutputSchema);
};
