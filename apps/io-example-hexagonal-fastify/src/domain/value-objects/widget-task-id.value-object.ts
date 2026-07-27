import { z } from "zod";

/** Unique symbol used to distinguish refresh task identifiers from other UUIDs. */
export const WidgetTaskIdBrand = Symbol("WidgetTaskId");

/** UUID identifying an asynchronous widget refresh task. */
export const WidgetTaskIdSchema = z.string().uuid().brand(WidgetTaskIdBrand);

/** Validated widget refresh task identifier. */
export type WidgetTaskId = z.infer<typeof WidgetTaskIdSchema>;
