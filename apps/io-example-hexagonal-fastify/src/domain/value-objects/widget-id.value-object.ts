import { z } from "zod";

/** Unique symbol used to distinguish widget identifiers from other UUIDs. */
export const WidgetIdBrand = Symbol("WidgetId");

/** UUID identifying a widget aggregate. */
export const WidgetIdSchema = z.string().uuid().brand(WidgetIdBrand);

/** Validated widget identifier. */
export type WidgetId = z.infer<typeof WidgetIdSchema>;
