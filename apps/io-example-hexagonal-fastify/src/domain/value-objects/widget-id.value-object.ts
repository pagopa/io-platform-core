import { z } from "zod";

/** Unique symbol used to distinguish widget identifiers from other UUIDs. */
export declare const WidgetIdBrand: unique symbol;

/** UUID identifying a widget aggregate. */
export const WidgetIdSchema = z.string().uuid().brand<typeof WidgetIdBrand>();

/** Validated widget identifier. */
export type WidgetId = z.infer<typeof WidgetIdSchema>;
