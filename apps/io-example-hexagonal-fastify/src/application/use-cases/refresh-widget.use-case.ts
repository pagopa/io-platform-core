import type { GenericError } from "@pagopa/hexagonal-core/domain/errors";
import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";

import { ok } from "neverthrow";

/**
 * Internal result of enqueueing a widget refresh job.
 *
 * The field is named `jobId` internally; the inbound handler's `outputMapper`
 * renames it to the public `taskId` and adds the accepted status literal.
 */
export interface RefreshWidgetEnqueued {
  jobId: string;
}

export interface RefreshWidgetInput {
  id: string;
}

export type RefreshWidgetUseCase = UseCase<
  RefreshWidgetInput,
  RefreshWidgetEnqueued,
  GenericError
>;

/** Deterministic sample job id used by the example implementation. */
const SAMPLE_JOB_ID = "22222222-2222-4222-8222-222222222222";

/**
 * Builds the refresh-widget use case.
 *
 * Simulates enqueueing an asynchronous refresh and returns the job id; the
 * handler maps this to a 202 Accepted response.
 */
export const makeRefreshWidgetUseCase = (): RefreshWidgetUseCase => async () =>
  ok({ jobId: SAMPLE_JOB_ID });
