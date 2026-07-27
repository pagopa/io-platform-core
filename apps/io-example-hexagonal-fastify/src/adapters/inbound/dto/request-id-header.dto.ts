import { z } from "zod";

import { RequestIdSchema } from "../../../domain/value-objects/request-id.value-object.js";

/** Schema for the custom request id header accepted by audit endpoints. */
export const RequestIdHeaderSchema = z.object({
  "x-request-id": RequestIdSchema,
});
