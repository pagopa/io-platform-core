import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import type { z } from "zod";

import { GenericError as GenericErrorValue } from "@pagopa/hexagonal-core/domain/errors";
import { err } from "neverthrow";

import { WidgetIdSchema } from "../../domain/entities/widget-id.entity.js";
import { WidgetSchema } from "../../domain/entities/widget.entity.js";

/** Input accepted by the widget retrieval use case. */
export type GetWidgetInput = z.input<typeof WidgetIdSchema>;

/** Use case contract for retrieving a widget. */
export type GetWidgetUseCase = UseCase<
  GetWidgetInput,
  z.input<typeof WidgetSchema>,
  GenericError
>;

/** Creates a widget retrieval use case. */
export const makeGetWidgetUseCase = (): GetWidgetUseCase => async () =>
  err(new GenericErrorValue("Not Implemented"));
