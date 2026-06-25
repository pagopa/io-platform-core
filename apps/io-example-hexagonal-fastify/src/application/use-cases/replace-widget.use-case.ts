import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import type { z } from "zod";

import { GenericError as GenericErrorValue } from "@pagopa/hexagonal-core/domain/errors";
import { err } from "neverthrow";

import { WidgetResponseSchema } from "../../adapters/inbound/fastify/dto/schemas.js";

/** Input accepted by the widget replacement use case. */
export interface ReplaceWidgetInput {
  description?: string;
  id: string;
  name: string;
}

/** Use case contract for replacing a widget. */
export type ReplaceWidgetUseCase = UseCase<
  ReplaceWidgetInput,
  z.input<typeof WidgetResponseSchema>,
  GenericError
>;

/** Creates a widget replacement use case. */
export const makeReplaceWidgetUseCase = (): ReplaceWidgetUseCase => async () =>
  err(new GenericErrorValue("Not Implemented"));
