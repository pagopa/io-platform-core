import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import type { z } from "zod";

import { GenericError as GenericErrorValue } from "@pagopa/hexagonal-core/domain/errors";
import { err } from "neverthrow";

import {
  ListWidgetsSchema,
  WidgetListSchema,
} from "../../domain/entities/widget-list.entity.js";

/** Input accepted by the widget listing use case. */
export type ListWidgetsInput = z.input<typeof ListWidgetsSchema>;

/** Use case contract for listing widgets. */
export type ListWidgetsUseCase = UseCase<
  ListWidgetsInput,
  z.input<typeof WidgetListSchema>,
  GenericError
>;

/** Creates a widget listing use case. */
export const makeListWidgetsUseCase = (): ListWidgetsUseCase => async () =>
  err(new GenericErrorValue("Not Implemented"));
