import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import type { z } from "zod";

import { GenericError as GenericErrorValue } from "@pagopa/hexagonal-core/domain/errors";
import { err } from "neverthrow";

import { WidgetAuditResponseSchema } from "../../adapters/inbound/fastify/dto/schemas.js";

/** Input accepted by the widget audit retrieval use case. */
export interface GetWidgetAuditInput {
  id: string;
  requestId: string;
}

/** Use case contract for retrieving widget audit events. */
export type GetWidgetAuditUseCase = UseCase<
  GetWidgetAuditInput,
  z.input<typeof WidgetAuditResponseSchema>,
  GenericError
>;

/** Creates a widget audit retrieval use case. */
export const makeGetWidgetAuditUseCase =
  (): GetWidgetAuditUseCase => async () =>
    err(new GenericErrorValue("Not Implemented"));
