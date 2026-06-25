import { z } from "zod";

import { WidgetSchema } from "../../../../domain/entities/widget.entity.js";

/**
 * Unique symbol used to brand {@link WidgetTaskId}.
 *
 * The async refresh endpoint returns an opaque task identifier; branding it
 * with a `unique symbol` keeps it nominally distinct from a widget id or any
 * other string. The declaration is exported (type-only, no runtime value) so
 * the inferred schema type is nameable across module boundaries.
 */
export declare const WidgetTaskIdBrand: unique symbol;

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
  description: WidgetSchema.shape.description,
  name: WidgetSchema.shape.name,
});

/** Schema for the body accepted when replacing a widget. */
export const ReplaceWidgetBodySchema = z.object({
  description: WidgetSchema.shape.description,
  name: WidgetSchema.shape.name,
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

/**
 * Public widget summary response schema.
 *
 * The summary endpoint's use case returns an internal, differently-shaped
 * value object (internal field names, epoch timestamp); the handler's
 * `outputMapper` reshapes it into this public schema, whose fields are all
 * derived from the domain {@link WidgetSchema}.
 */
export const WidgetSummaryResponseSchema = z.object({
  createdAt: WidgetSchema.shape.createdAt,
  description: WidgetSchema.shape.description,
  id: WidgetSchema.shape.id,
  name: WidgetSchema.shape.name,
});

/**
 * Response schema for the asynchronous widget refresh endpoint (202 Accepted).
 *
 * The use case returns an internal `{ jobId }` shape; the handler's
 * `outputMapper` renames it to the public `taskId` and adds the accepted
 * status literal.
 */
export const WidgetRefreshAcceptedSchema = z.object({
  status: z.literal("accepted"),
  taskId: z.string().uuid().brand<typeof WidgetTaskIdBrand>(),
});

/** Schema for a single widget audit event in audit responses. */
const WidgetAuditEventSchema = z.object({
  at: WidgetSchema.shape.createdAt,
  message: z.string(),
  requestId: z.string().min(1).optional(),
  type: z.string().min(1),
});

/** Audit response schema returned by the widget audit endpoint. */
export const WidgetAuditResponseSchema = z.object({
  events: z.array(WidgetAuditEventSchema),
  widgetId: WidgetSchema.shape.id,
});
