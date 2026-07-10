import { z } from "zod";

import { WidgetSchema } from "./widget.entity.js";

/** Schema for listing widgets. */
export const ListWidgetsSchema = z.object({
  filter: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/** Schema for a paginated widget collection. */
export const WidgetListSchema = z.object({
  items: z.array(WidgetSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});
