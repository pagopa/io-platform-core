import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";

import { ok } from "neverthrow";

export interface ArchiveWidgetInput {
  id: string;
}

/**
 * Result of archiving a widget.
 *
 * The handler maps this endpoint to a 204 No Content response, so this value
 * is never serialized into the body — it exists only to show that a use case
 * may return data even when the HTTP contract strips it.
 */
export interface ArchiveWidgetResult {
  archived: true;
}

export type ArchiveWidgetUseCase = UseCase<
  ArchiveWidgetInput,
  ArchiveWidgetResult,
  GenericError
>;

/** Builds the archive-widget use case. */
export const makeArchiveWidgetUseCase = (): ArchiveWidgetUseCase => async () =>
  ok({ archived: true });
