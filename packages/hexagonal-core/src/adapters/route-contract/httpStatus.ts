/**
 * Single source of truth for the HTTP status codes a route contract classifies.
 *
 * Both the type-level helpers (in `routeContract.ts`) and the runtime adapters
 * (e.g. the Fastify mount) derive their behavior from the `as const` arrays
 * declared here, so the success / redirect / no-body / adapter-only categories
 * are defined exactly once.
 */

/** 2xx status codes mounted as a successful outcome carrying a body. */
export const SUCCESS_BODY_STATUS_CODES = [200, 201, 202] as const;

/** 2xx status code mounted as a successful outcome with no body. */
export const SUCCESS_NO_BODY_STATUS_CODES = [204] as const;

/**
 * 3xx redirect status codes. Mounted as a (body-less) successful outcome whose
 * mapped `string` output is written to the `Location` header.
 */
export const REDIRECT_STATUS_CODES = [301, 302, 303, 307, 308] as const;

/**
 * Every status code the adapter mounts as a successful outcome: the 2xx codes
 * plus the supported redirects.
 */
export const ALL_SUCCESS_STATUS_CODES = [
  ...SUCCESS_BODY_STATUS_CODES,
  ...SUCCESS_NO_BODY_STATUS_CODES,
  ...REDIRECT_STATUS_CODES,
] as const;

/** Success status codes that never carry a response body (204 + redirects). */
export const NO_BODY_STATUS_CODES = [
  ...SUCCESS_NO_BODY_STATUS_CODES,
  ...REDIRECT_STATUS_CODES,
] as const;

/**
 * Status codes the adapter always emits independently of the use case. The
 * adapter owns request validation, so `400` is produced whenever validation
 * fails regardless of what the use case declares; it is therefore excluded from
 * the backward error-coverage check.
 */
export const ADAPTER_ONLY_STATUS_CODES = [400] as const;

/** A status code emitted by the adapter framework itself (request validation). */
export type AdapterOnlyStatus = (typeof ADAPTER_ONLY_STATUS_CODES)[number];

/** A status code the adapter mounts as a successful outcome (2xx or redirect). */
export type SuccessStatusCode = (typeof ALL_SUCCESS_STATUS_CODES)[number];

const successStatusSet: ReadonlySet<number> = new Set(ALL_SUCCESS_STATUS_CODES);
const noBodyStatusSet: ReadonlySet<number> = new Set(NO_BODY_STATUS_CODES);
const redirectStatusSet: ReadonlySet<number> = new Set(REDIRECT_STATUS_CODES);

/** Returns true when the status is mounted as a successful outcome. */
export const isSuccessStatus = (status: number): status is SuccessStatusCode =>
  successStatusSet.has(status);

/** Returns true when the status never carries a response body. */
export const isNoBodyStatus = (status: number): boolean =>
  noBodyStatusSet.has(status);

/** Returns true when the status is a supported 3xx redirect. */
export const isRedirectStatus = (status: number): boolean =>
  redirectStatusSet.has(status);
