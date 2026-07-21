import { NonEmptyStringSchema } from "@pagopa/hexagonal-core/domain/value-objects";
import { z } from "zod";

/** Unique symbol used to distinguish caller identifiers from other strings. */
export const CallerIdBrand = Symbol("CallerId");

/** Identifier assigned to an authenticated caller by the API gateway. */
export const CallerIdSchema = NonEmptyStringSchema.brand(CallerIdBrand);

/** Validated identifier for an authenticated caller. */
export type CallerId = z.infer<typeof CallerIdSchema>;
