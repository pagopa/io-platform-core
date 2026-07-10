import { z } from "zod";

import { WidgetSchema } from "../../../domain/entities/widget.entity.js";

/**
 * Public widget summary response schema.
 *
 * The summary endpoint's use case returns an internal, differently-shaped
 * value object (internal field names, epoch timestamp); the handler's
 * `outputMapper` reshapes it into this public schema, whose fields are all
 * derived from the domain {@link WidgetSchema}.
 */
export const WidgetSummarySchema = z.object({
  createdAt: WidgetSchema.shape.createdAt,
  description: WidgetSchema.shape.description,
  id: WidgetSchema.shape.id,
  name: WidgetSchema.shape.name,
});
