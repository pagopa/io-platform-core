import { z } from "zod";

import { WidgetSchema } from "./widget.entity.js";

/** Schema for a single widget audit event in audit responses. */
const WidgetAuditEventSchema = z.object({
  at: WidgetSchema.shape.createdAt,
  message: z.string(),
  requestId: z.string().min(1).optional(),
  type: z.string().min(1),
});

/** Audit response schema returned by the widget audit endpoint. */
export const WidgetAuditSchema = z.object({
  events: z.array(WidgetAuditEventSchema),
  widgetId: WidgetSchema.shape.id,
});
