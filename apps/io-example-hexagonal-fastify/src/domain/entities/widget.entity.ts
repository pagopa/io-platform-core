import { z } from "zod";

/**
 * Zod schema for the demo Widget aggregate exposed by the example API.
 *
 * The `id` field is a UUID branded as `WidgetId` to avoid mixing widget
 * identifiers with arbitrary strings, while `createdAt` is serialized as an
 * ISO-8601 datetime string for transport-friendly responses.
 */
export const WidgetSchema = z.object({
  createdAt: z.string().datetime(),
  description: z.string().optional(),
  id: z.string().uuid().brand<"WidgetId">(),
  name: z.string(),
});

/** Domain type inferred from {@link WidgetSchema}. */
export type Widget = z.infer<typeof WidgetSchema>;
