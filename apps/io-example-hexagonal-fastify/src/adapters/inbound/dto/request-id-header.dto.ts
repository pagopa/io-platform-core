import { z } from "zod";

/** Schema for the custom request id header accepted by audit endpoints. */
export const RequestIdHeaderSchema = z.object({
  "x-request-id": z.string().min(1),
});
