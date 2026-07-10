import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import type { z } from "zod";

import { GenericError as GenericErrorValue } from "@pagopa/hexagonal-core/domain/errors";
import { err } from "neverthrow";

import { CreateWidgetSchema } from "../../domain/entities/widget-mutation.entity.js";
import { WidgetSchema } from "../../domain/entities/widget.entity.js";

/** Input accepted by the widget creation use case. */
export type CreateWidgetInput = z.input<typeof CreateWidgetSchema>;

/** Use case contract for creating a widget. */
export type CreateWidgetUseCase = UseCase<
  CreateWidgetInput,
  z.input<typeof WidgetSchema>,
  GenericError
>;

/** Creates a widget creation use case. */
export const makeCreateWidgetUseCase = (): CreateWidgetUseCase => async () =>
  err(new GenericErrorValue("Not Implemented"));
