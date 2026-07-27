import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";
import type { z } from "zod";

import { GenericError as GenericErrorValue } from "@pagopa/hexagonal-core/domain/errors";
import { err } from "neverthrow";

import { WidgetIdPathSchema } from "../../domain/entities/widget-id.entity.js";
import { PatchWidgetSchema } from "../../domain/entities/widget-mutation.entity.js";
import { WidgetSchema } from "../../domain/entities/widget.entity.js";

/** Input accepted by the widget patch use case. */
export type PatchWidgetInput = z.input<typeof PatchWidgetSchema> &
  z.input<typeof WidgetIdPathSchema>;

/** Use case contract for patching a widget. */
export type PatchWidgetUseCase = UseCase<
  PatchWidgetInput,
  z.input<typeof WidgetSchema>,
  GenericError
>;

/** Creates a widget patch use case. */
export const makePatchWidgetUseCase = (): PatchWidgetUseCase => async () =>
  err(new GenericErrorValue("Not Implemented"));
