import { z } from "zod";

/**
 * Unique symbol used to brand {@link WidgetTaskId}.
 *
 * The async refresh endpoint returns an opaque task identifier; branding it
 * with a `unique symbol` keeps it nominally distinct from a widget id or any
 * other string. The declaration is exported (type-only, no runtime value) so
 * the inferred schema type is nameable across module boundaries.
 */
export declare const WidgetTaskIdBrand: unique symbol;

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
