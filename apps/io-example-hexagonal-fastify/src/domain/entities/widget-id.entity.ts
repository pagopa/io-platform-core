import { z } from "zod";

import { WidgetIdSchema } from "../value-objects/widget-id.value-object.js";

/** Schema for a widget identifier. */
export const WidgetIdPathSchema = z.object({
  id: WidgetIdSchema,
});
