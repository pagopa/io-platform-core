import { NonEmptyStringSchema } from "@pagopa/hexagonal-core/domain/value-objects";
import { z } from "zod";

/** Unique symbol used to distinguish request identifiers from other strings. */
export const RequestIdBrand = Symbol("RequestId");

/** Correlation identifier attached to an inbound request. */
export const RequestIdSchema = NonEmptyStringSchema.brand(RequestIdBrand);

/** Validated request correlation identifier. */
export type RequestId = z.infer<typeof RequestIdSchema>;
