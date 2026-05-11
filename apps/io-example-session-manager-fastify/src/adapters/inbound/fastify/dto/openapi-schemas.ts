import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { EmailAddressSchema, FiscalCodeSchema } from "@pagopa/io-core-domain";
import { z } from "zod";

extendZodWithOpenApi(z);

// ---------------------------------------------------------------------------
// Re-usable primitive schemas (appear as named $ref components)
// ---------------------------------------------------------------------------

export const FiscalCodeOpenApi = FiscalCodeSchema.meta({
  description: "The Italian fiscal code (Codice Fiscale).",
  example: "RSSMRA85M01H501U",
  id: "FiscalCode",
});

export const EmailAddressOpenApi = EmailAddressSchema.meta({
  description: "A valid email address.",
  example: "mario.rossi@example.com",
  format: "email",
  id: "EmailAddress",
});

// ---------------------------------------------------------------------------
// Lollipop header schemas
// ---------------------------------------------------------------------------

export const LollipopMethod = z
  .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
  .meta({
    description: "The method of the endpoint called by IO app.",
    id: "LollipopMethod",
  });

export const LollipopOriginalURL = z
  .string()
  .regex(/^https:\/\//)
  .meta({
    description: "The url of the endpoint called by IO app.",
    format: "uri",
    id: "LollipopOriginalURL",
  });

export const LollipopSignatureInput = z
  .string()
  .regex(/^(?:sig\d+=[^,]*)(?:,\s*(?:sig\d+=[^,]*))*$/)
  .meta({
    description:
      "The signature input, needed to verify the `signature` header.",
    id: "LollipopSignatureInput",
  });

export const LollipopSignature = z
  .string()
  .regex(/^((sig[0-9]+)=:[A-Za-z0-9+/=]*:(, ?)?)+$/)
  .meta({
    description:
      "The signature of the HTTP request, signed by the client with its private key.",
    id: "LollipopSignature",
  });

/** Header schema for Lollipop-protected endpoints (POST /fast-login). */
export const LollipopHeadersSchema = z.object({
  signature: LollipopSignature,
  "signature-input": LollipopSignatureInput,
  "x-pagopa-lollipop-original-method": LollipopMethod,
  "x-pagopa-lollipop-original-url": LollipopOriginalURL,
});

// ---------------------------------------------------------------------------
// Bearer authorization header schema
// ---------------------------------------------------------------------------

/** Header schema for Bearer-authenticated endpoints. */
export const BearerAuthHeaderSchema = z.object({
  authorization: z.string().min(1).meta({
    description: "Bearer token as `Authorization: Bearer <token>`.",
    example: "Bearer c77de47586c841adbd1a1caeb90dce25dce",
  }),
});

// ---------------------------------------------------------------------------
// Query schemas
// ---------------------------------------------------------------------------

/** Optional `fields` sparse-fieldset query param used by GET /session. */
export const SessionQuerySchema = z.object({
  fields: z.string().optional().meta({
    description:
      "Comma-separated list of fields to return. Example: ?fields=(spidLevel,walletToken)",
    example: "(spidLevel,walletToken)",
  }),
});

/** Query params for GET /login. */
export const LoginQuerySchema = z.object({
  authLevel: z.enum(["SpidL2", "SpidL3"]).meta({
    description: "SPID AuthLevel.",
    example: "SpidL2",
  }),
  entityID: z
    .enum([
      "lepidaid",
      "infocertid",
      "sielteid",
      "namirialid",
      "timid",
      "arubaid",
      "posteid",
      "spiditalia",
      "teamsystemid",
      "ehtid",
      "infocamereid",
      "intesiid",
      "xx_servizicie_coll",
      "xx_servizicie",
      "xx_servizicie_test",
    ])
    .meta({ description: "An ID that refers to a specific IDP." }),
});

/** Optional header params for GET /login. */
export const LoginHeadersSchema = z.object({
  loginType: z
    .enum(["LV", "LEGACY"])
    .optional()
    .meta({ description: "Login type." }),
  "x-pagopa-current-user": z.string().optional().meta({
    description: "Currently logged-in user's FiscalCode hashed with sha256.",
  }),
  "x-pagopa-lollipop-pub-key": z.string().optional().meta({
    description: "Base64url encoded JWK Public Key.",
    format: "JwkPublicKeyFromToken",
  }),
  "x-pagopa-lollipop-pub-key-hash-algo": z
    .enum(["sha256", "sha384", "sha512"])
    .optional()
    .meta({ description: "Selected hashing algorithm for jwk thumbprint." }),
});

/** Optional login-type header for POST /test-login. */
export const TestLoginHeadersSchema = z.object({
  loginType: z
    .enum(["LV", "LEGACY"])
    .optional()
    .meta({ description: "Login type." }),
  "x-pagopa-lollipop-pub-key": z.string().optional().meta({
    description: "Base64url encoded JWK Public Key.",
    format: "JwkPublicKeyFromToken",
  }),
  "x-pagopa-lollipop-pub-key-hash-algo": z
    .enum(["sha256", "sha384", "sha512"])
    .optional()
    .meta({ description: "Selected hashing algorithm for jwk thumbprint." }),
});

// ---------------------------------------------------------------------------
// Fast-login response schemas
// ---------------------------------------------------------------------------

export const FastLoginResponse = z
  .object({
    token: z.string().min(1).meta({
      description: "48 bytes token (hex encoded).",
      example:
        "c77de47586c841adbd1a1caeb90dce25dcecebed620488a4f932a6280b10ee99a77b6c494a8a6e6884ccbeb6d3fe736b",
    }),
  })
  .meta({ id: "FastLoginResponse" });

export const Nonce = z
  .string()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  )
  .meta({
    description: "UUID v4 formatted nonce as per RFC 4122.",
    example: "870c6d89-a3c4-48b1-a796-cdacddaf94b4",
    id: "Nonce",
  });

export const GenerateNonceResponse = z
  .object({ nonce: Nonce })
  .meta({ id: "GenerateNonceResponse" });

// ---------------------------------------------------------------------------
// Session schemas
// ---------------------------------------------------------------------------

export const SpidLevel = z
  .enum([
    "https://www.spid.gov.it/SpidL1",
    "https://www.spid.gov.it/SpidL2",
    "https://www.spid.gov.it/SpidL3",
  ])
  .meta({ description: "A SPID level.", id: "SpidLevel" });

export const AssertionRefSha256 = z
  .string()
  .regex(/^(sha256-[A-Za-z0-9-_=]{1,44})$/)
  .meta({ id: "AssertionRefSha256" });

export const AssertionRefSha384 = z
  .string()
  .regex(/^(sha384-[A-Za-z0-9-_=]{1,66})$/)
  .meta({ id: "AssertionRefSha384" });

export const AssertionRefSha512 = z
  .string()
  .regex(/^(sha512-[A-Za-z0-9-_=]{1,88})$/)
  .meta({ id: "AssertionRefSha512" });

export const AssertionRef = z
  .union([AssertionRefSha512, AssertionRefSha384, AssertionRefSha256])
  .meta({ id: "AssertionRef" });

export const PublicSession = z
  .object({
    bpdToken: z.string().optional(),
    expirationDate: z.string().meta({ format: "date-time" }).optional(),
    fimsToken: z.string().optional(),
    lollipopAssertionRef: AssertionRef.optional(),
    myPortalToken: z.string().optional(),
    spidLevel: SpidLevel.optional(),
    walletToken: z.string().optional(),
    zendeskToken: z.string().optional(),
  })
  .meta({
    description: "Describe the current session of an authenticated user.",
    id: "PublicSession",
    title: "User session data",
  });

export const SuccessResponse = z
  .object({ message: z.string().optional() })
  .meta({ id: "SuccessResponse" });

// ---------------------------------------------------------------------------
// Auth schemas
// ---------------------------------------------------------------------------

export const PasswordLogin = z
  .object({
    password: z.string().min(1).meta({ example: "secret" }),
    username: FiscalCodeOpenApi,
  })
  .meta({ id: "PasswordLogin" });

export const AccessToken = z
  .object({ token: z.string().min(1) })
  .meta({ id: "AccessToken" });

export const SAMLResponse = z.string().min(1).meta({
  description: "A string representation of a signed SPID/CIE response.",
  id: "SAMLResponse",
});

// ---------------------------------------------------------------------------
// Healthcheck / info
// ---------------------------------------------------------------------------

export const BackendVersion = z
  .object({ version: z.string().optional() })
  .meta({ id: "BackendVersion", title: "The App version" });

// ---------------------------------------------------------------------------
// User identity schemas
// ---------------------------------------------------------------------------

export const UserIdentity = z
  .object({
    assertion_ref: AssertionRef.optional(),
    date_of_birth: z.string(),
    family_name: z.string(),
    fiscal_code: FiscalCodeOpenApi,
    name: z.string(),
    session_tracking_id: z.string().optional(),
    spid_email: EmailAddressOpenApi.optional(),
    spid_idp: z.string().optional(),
    spid_level: SpidLevel,
  })
  .meta({
    description: "Describes the user's identity while authenticated.",
    id: "UserIdentity",
    title: "CIE or SPID User Identity",
  });

export const SessionTTL = z
  .object({
    created_at: z.number(),
    token_remaining_ttl: z.number().int(),
  })
  .meta({ id: "SessionTTL" });

export const UserIdentityWithTtl = UserIdentity.merge(SessionTTL).meta({
  description: "User identity enriched with session TTL information.",
  id: "UserIdentityWithTtl",
});
