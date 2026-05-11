import type { UseCase } from "@pagopa/io-core-domain";

import { ok } from "neverthrow";

/**
 * GET /metadata responds with SPID XML metadata (application/xml).
 * This use case has no domain-error responses in the spec.
 * Returns the XML string directly as the output.
 */
export type MetadataUseCase = UseCase<Record<string, never>, string, never>;

export const metadataUseCase: MetadataUseCase = async (_) =>
  ok('<?xml version="1.0" encoding="UTF-8"?><EntityDescriptor/>');
