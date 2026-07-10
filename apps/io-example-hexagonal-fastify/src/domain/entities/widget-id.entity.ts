import { z } from "zod";

import { WidgetSchema } from "./widget.entity.js";

/** Schema for a widget identifier. */
export const WidgetIdSchema = z.object({
  id: WidgetSchema.shape.id,
});
