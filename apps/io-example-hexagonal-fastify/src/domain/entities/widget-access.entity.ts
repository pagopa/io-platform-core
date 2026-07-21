import { EmailAddressSchema } from "@pagopa/hexagonal-core/domain/value-objects";
import { z } from "zod";

import { CallerIdSchema } from "../value-objects/caller-id.value-object.js";
import { ClientIpSchema } from "../value-objects/client-ip.value-object.js";
import { WidgetIdSchema } from "../value-objects/widget-id.value-object.js";

/** Response shape used to demonstrate middleware context propagation. */
export const WidgetAccessSchema = z.object({
  caller: z.object({
    email: EmailAddressSchema,
    id: CallerIdSchema,
  }),
  clientIp: ClientIpSchema.optional(),
  widgetId: WidgetIdSchema,
});

/** Domain type inferred from {@link WidgetAccessSchema}. */
export type WidgetAccess = z.infer<typeof WidgetAccessSchema>;
