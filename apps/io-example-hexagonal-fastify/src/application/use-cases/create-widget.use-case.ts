import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import type { z } from "zod";

import { GenericError as GenericErrorValue } from "@pagopa/hexagonal-core/domain/errors";
import { err } from "neverthrow";

import { WidgetResponseSchema } from "../../adapters/inbound/fastify/dto/schemas.js";

/** Input accepted by the widget creation use case. */
export interface CreateWidgetInput {
  description?: string;
  name: string;
}

/** Use case contract for creating a widget. */
export type CreateWidgetUseCase = UseCase<
  CreateWidgetInput,
  z.input<typeof WidgetResponseSchema>,
  GenericError
>;

/** Creates a widget creation use case. */
export const makeCreateWidgetUseCase = (): CreateWidgetUseCase => async () =>
  err(new GenericErrorValue("Not Implemented"));
