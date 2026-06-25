import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import type { z } from "zod";

import { GenericError as GenericErrorValue } from "@pagopa/hexagonal-core/domain/errors";
import { err } from "neverthrow";

import { WidgetResponseSchema } from "../../adapters/inbound/fastify/dto/schemas.js";

/** Input accepted by the widget patch use case. */
export interface PatchWidgetInput {
  description?: string;
  id: string;
  name?: string;
}

/** Use case contract for patching a widget. */
export type PatchWidgetUseCase = UseCase<
  PatchWidgetInput,
  z.input<typeof WidgetResponseSchema>,
  GenericError
>;

/** Creates a widget patch use case. */
export const makePatchWidgetUseCase = (): PatchWidgetUseCase => async () =>
  err(new GenericErrorValue("Not Implemented"));
