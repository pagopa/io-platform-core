import { z } from "zod";

import { WidgetTaskIdSchema } from "../../../domain/value-objects/widget-task-id.value-object.js";

/**
 * Response schema for the asynchronous widget refresh endpoint (202 Accepted).
 *
 * The use case returns an internal `{ jobId }` shape; the handler's
 * `outputMapper` renames it to the public `taskId` and adds the accepted
 * status literal.
 */
export const WidgetRefreshAcceptedSchema = z.object({
  status: z.literal("accepted"),
  taskId: WidgetTaskIdSchema,
});
