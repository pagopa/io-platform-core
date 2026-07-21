import {
  EmailAddressSchema,
  NonEmptyStringSchema,
} from "@pagopa/hexagonal-core/domain/value-objects";
import { z } from "zod";

import { CallerIdSchema } from "../../../domain/value-objects/caller-id.value-object.js";

/** Header required by the authentication middleware example. */
export const AuthorizationHeadersSchema = z.object({
  authorization: NonEmptyStringSchema,
});

/** Optional forwarded client address used by the client-IP middleware example. */
export const ClientIpHeadersSchema = z.object({
  "x-forwarded-for": NonEmptyStringSchema.optional(),
});

/** Gateway headers used to identify the authenticated caller. */
export const CallerHeadersSchema = z.object({
  "x-user-email": EmailAddressSchema,
  "x-user-id": CallerIdSchema,
});

/** Complete header contract used by the composed middleware route. */
export const RequestContextHeadersSchema = AuthorizationHeadersSchema.merge(
  ClientIpHeadersSchema,
).merge(CallerHeadersSchema);
