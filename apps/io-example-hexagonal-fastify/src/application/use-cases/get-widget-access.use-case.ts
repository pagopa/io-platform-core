import type { UseCase } from "@pagopa/hexagonal-core/domain/ports";

import { ok } from "neverthrow";

import type { WidgetAccess } from "../../domain/entities/widget-access.entity.js";

/** Input accepted after the inbound adapter maps middleware context. */
export type GetWidgetAccessInput = WidgetAccess;

/** Use case contract for the middleware context propagation example. */
export type GetWidgetAccessUseCase = UseCase<
  GetWidgetAccessInput,
  WidgetAccess,
  never
>;

/**
 * Builds the access example use case.
 *
 * Returning the mapped input makes the middleware-produced context visible in
 * the response while keeping the application layer transport-neutral.
 */
export const makeGetWidgetAccessUseCase =
  (): GetWidgetAccessUseCase => async (input) =>
    ok(input);
