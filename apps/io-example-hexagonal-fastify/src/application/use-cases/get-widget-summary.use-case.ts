import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";

import { ok } from "neverthrow";

export interface GetWidgetSummaryInput {
  id: string;
}

export type GetWidgetSummaryUseCase = UseCase<
  GetWidgetSummaryInput,
  WidgetSummaryView,
  GenericError
>;

/**
 * Internal view returned by the summary use case.
 *
 * Note how its shape intentionally differs from the public response: it uses
 * internal field names (`widgetId`, `label`, `details`) and an epoch
 * millisecond timestamp (`createdAtEpochMs`). The inbound handler's
 * `outputMapper` is responsible for reshaping this into the public DTO.
 */
export interface WidgetSummaryView {
  createdAtEpochMs: number;
  details?: string;
  label: string;
  widgetId: string;
}

/**
 * Builds the get-widget-summary use case.
 *
 * Returns a static in-memory summary so the example can demonstrate a working
 * `outputMapper`; a real implementation would load the widget from a port.
 */
export const makeGetWidgetSummaryUseCase =
  (): GetWidgetSummaryUseCase => async (input) =>
    ok({
      createdAtEpochMs: Date.UTC(2024, 0, 1),
      details: "Sample widget summary",
      label: "Sample Widget",
      widgetId: input.id,
    });
