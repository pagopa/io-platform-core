import { z } from "zod";

import { WidgetSchema } from "./widget.entity.js";

/** Schema for creating a widget. */
export const CreateWidgetSchema = z.object({
  description: WidgetSchema.shape.description,
  name: WidgetSchema.shape.name,
});

/** Schema for replacing a widget. */
export const ReplaceWidgetSchema = z.object({
  description: WidgetSchema.shape.description,
  name: WidgetSchema.shape.name,
});

/** Schema for partially updating a widget. */
export const PatchWidgetSchema = ReplaceWidgetSchema.partial();
