import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import type { z } from "zod";

import { GenericError as GenericErrorValue } from "@pagopa/hexagonal-core/domain/errors";
import { err } from "neverthrow";

import { WidgetResponseSchema } from "../../adapters/inbound/fastify/dto/schemas.js";

/** Input accepted by the widget retrieval use case. */
export interface GetWidgetInput {
  id: string;
}

/** Use case contract for retrieving a widget. */
export type GetWidgetUseCase = UseCase<
  GetWidgetInput,
  z.input<typeof WidgetResponseSchema>,
  GenericError
>;

/** Creates a widget retrieval use case. */
export const makeGetWidgetUseCase = (): GetWidgetUseCase => async () =>
  err(new GenericErrorValue("Not Implemented"));
