import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import type { z } from "zod";

import { GenericError as GenericErrorValue } from "@pagopa/hexagonal-core/domain/errors";
import { err } from "neverthrow";

import { WidgetIdPathSchema } from "../../domain/entities/widget-id.entity.js";
import { ReplaceWidgetSchema } from "../../domain/entities/widget-mutation.entity.js";
import { WidgetSchema } from "../../domain/entities/widget.entity.js";

/** Input accepted by the widget replacement use case. */
export type ReplaceWidgetInput = z.input<typeof ReplaceWidgetSchema> &
  z.input<typeof WidgetIdPathSchema>;

/** Use case contract for replacing a widget. */
export type ReplaceWidgetUseCase = UseCase<
  ReplaceWidgetInput,
  z.input<typeof WidgetSchema>,
  GenericError
>;

/** Creates a widget replacement use case. */
export const makeReplaceWidgetUseCase = (): ReplaceWidgetUseCase => async () =>
  err(new GenericErrorValue("Not Implemented"));
