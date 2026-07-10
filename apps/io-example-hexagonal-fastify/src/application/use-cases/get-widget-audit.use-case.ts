import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import type { z } from "zod";

import { GenericError as GenericErrorValue } from "@pagopa/hexagonal-core/domain/errors";
import { err } from "neverthrow";

import { WidgetAuditSchema } from "../../domain/entities/widget-audit.entity.js";
import { WidgetIdSchema } from "../../domain/entities/widget-id.entity.js";

/** Input accepted by the widget audit retrieval use case. */
export type GetWidgetAuditInput = z.input<typeof WidgetIdSchema> & {
  requestId: string;
};

/** Use case contract for retrieving widget audit events. */
export type GetWidgetAuditUseCase = UseCase<
  GetWidgetAuditInput,
  z.input<typeof WidgetAuditSchema>,
  GenericError
>;

/** Creates a widget audit retrieval use case. */
export const makeGetWidgetAuditUseCase =
  (): GetWidgetAuditUseCase => async () =>
    err(new GenericErrorValue("Not Implemented"));
