import { z } from "zod";

import { WidgetSchema } from "../../../../domain/entities/widget.entity.js";

/** Schema for path parameters that identify a widget by id. */
export const WidgetIdPathSchema = z.object({
  id: WidgetSchema.shape.id,
});

/** Schema for query parameters accepted by the widget list endpoint. */
export const ListWidgetsQuerySchema = z.object({
  filter: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

/** Schema for the body accepted when creating a widget. */
export const CreateWidgetBodySchema = z.object({
  description: z.string().optional(),
  name: z.string().min(1),
});

/** Schema for the body accepted when replacing a widget. */
export const ReplaceWidgetBodySchema = z.object({
  description: z.string().optional(),
  name: z.string().min(1),
});

/** Schema for the body accepted when partially updating a widget. */
export const PatchWidgetBodySchema = ReplaceWidgetBodySchema.partial();

/** Schema for the custom request id header accepted by audit endpoints. */
export const RequestIdHeaderSchema = z.object({
  "x-request-id": z.string().min(1),
});

/** Public widget response schema returned by widget read and write endpoints. */
export const WidgetResponseSchema = WidgetSchema;

/** Paginated response schema returned by the widget list endpoint. */
export const WidgetListResponseSchema = z.object({
  items: z.array(WidgetResponseSchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});

/** Schema for a single widget audit event in audit responses. */
const WidgetAuditEventSchema = z.object({
  at: z.string().datetime(),
  message: z.string(),
  requestId: z.string().min(1).optional(),
  type: z.string().min(1),
});

/** Audit response schema returned by the widget audit endpoint. */
export const WidgetAuditResponseSchema = z.object({
  events: z.array(WidgetAuditEventSchema),
  widgetId: WidgetSchema.shape.id,
});
