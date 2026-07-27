import { z } from "zod";

/** Unique symbol used to distinguish client addresses from other strings. */
export const ClientIpBrand = Symbol("ClientIp");

/** Client address resolved from inbound forwarding information. */
export const ClientIpSchema = z.ipv4().brand(ClientIpBrand);

/** Validated client address. */
export type ClientIp = z.infer<typeof ClientIpSchema>;
