import { NonEmptyStringSchema } from "@pagopa/hexagonal-core/domain/value-objects";
import { z } from "zod";

/** Client address resolved from inbound forwarding information. */
export const ClientIpSchema = NonEmptyStringSchema.brand<"ClientIp">();

/** Validated client address. */
export type ClientIp = z.infer<typeof ClientIpSchema>;
