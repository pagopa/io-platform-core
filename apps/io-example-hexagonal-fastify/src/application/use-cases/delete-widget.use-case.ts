import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";

import { GenericError as GenericErrorValue } from "@pagopa/hexagonal-core/domain/errors";
import { err } from "neverthrow";

/** Input accepted by the widget deletion use case. */
export interface DeleteWidgetInput {
  id: string;
}

/** Use case contract for deleting a widget. */
export type DeleteWidgetUseCase = UseCase<
  DeleteWidgetInput,
  Record<string, never>,
  GenericError
>;

/** Creates a widget deletion use case. */
export const makeDeleteWidgetUseCase = (): DeleteWidgetUseCase => async () =>
  err(new GenericErrorValue("Not Implemented"));
