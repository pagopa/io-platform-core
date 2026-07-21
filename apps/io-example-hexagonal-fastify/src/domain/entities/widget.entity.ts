import { z } from "zod";

import { WidgetIdSchema } from "../value-objects/widget-id.value-object.js";

/**
 * Zod schema for the demo Widget aggregate exposed by the example API.
 *
 * The `id` field is a UUID branded as `WidgetId` to avoid mixing widget
 * identifiers with arbitrary strings, while `createdAt` is serialized as an
 * ISO-8601 datetime string for transport-friendly responses.
 *
 * This schema is the single source of truth for widget field constraints
 * (e.g. a non-empty `name`); inbound DTO schemas derive their fields from it
 * via `WidgetSchema.shape.*` rather than redefining the constraints.
 */
export const WidgetSchema = z.object({
  createdAt: z.string().datetime(),
  description: z.string().optional(),
  id: WidgetIdSchema,
  name: z.string().min(1),
});

/** Domain type inferred from {@link WidgetSchema}. */
export type Widget = z.infer<typeof WidgetSchema>;

/** Branded widget identifier type. */
export type WidgetId = Widget["id"];
