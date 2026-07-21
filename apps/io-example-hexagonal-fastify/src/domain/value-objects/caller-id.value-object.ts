import { NonEmptyStringSchema } from "@pagopa/hexagonal-core/domain/value-objects";
import { z } from "zod";

/** Identifier assigned to an authenticated caller by the API gateway. */
export const CallerIdSchema = NonEmptyStringSchema.brand<"CallerId">();

/** Validated identifier for an authenticated caller. */
export type CallerId = z.infer<typeof CallerIdSchema>;
