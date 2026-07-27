import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import type { z } from "zod";

import { GenericError } from "@pagopa/hexagonal-core";
import { err } from "neverthrow";

import type { WidgetAlreadyExistsError } from "../../domain/errors/widget-already-exists.error.js";

import { CreateWidgetSchema } from "../../domain/entities/widget-mutation.entity.js";
import { WidgetSchema } from "../../domain/entities/widget.entity.js";
import { WidgetAlreadyExistsError as WidgetAlreadyExistsErrorValue } from "../../domain/errors/widget-already-exists.error.js";

/** Input accepted by the widget creation use case. */
export type CreateWidgetInput = z.input<typeof CreateWidgetSchema>;

/** Use case contract for creating a widget. */
export type CreateWidgetUseCase = UseCase<
  CreateWidgetInput,
  z.input<typeof WidgetSchema>,
  GenericError | WidgetAlreadyExistsError
>;

/** Creates a widget creation use case. */
export const makeCreateWidgetUseCase = (): CreateWidgetUseCase => async () =>
  err(new WidgetAlreadyExistsErrorValue());
