import { NonEmptyStringSchema } from "@pagopa/hexagonal-core/domain/value-objects";
import { z } from "zod";

/** Correlation identifier attached to an inbound request. */
export const RequestIdSchema = NonEmptyStringSchema.brand<"RequestId">();

/** Validated request correlation identifier. */
export type RequestId = z.infer<typeof RequestIdSchema>;
