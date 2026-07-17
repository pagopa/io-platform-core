import type { Result } from "neverthrow";

import { err, ok } from "neverthrow";

import type { BaseError } from "../../domain/errors/index.js";
import type { HttpMappedError } from "../error-mapper/errorHttpMetadata.js";
import type { HttpRequestPayload } from "../validator/httpInputStandardSchemaValidator.js";

/** Empty context passed to a sequence before its first middleware. */
export type EmptyHttpMiddlewareContext = Record<never, never>;

/**
 * Validates middleware order, required context and append-only context keys.
 * Intersect this with a middleware tuple at API boundaries.
 */
export type EnsureHttpMiddlewareSequence<
  Middlewares extends HttpMiddlewareSequence,
> = [AnalyzeHttpMiddlewareSequence<Middlewares>["issue"]] extends [never]
  ? unknown
  : AnalyzeHttpMiddlewareSequence<Middlewares>["issue"];

/** Context accumulated after every middleware in a sequence has succeeded. */
export type HttpMiddlewareContext<Middlewares extends HttpMiddlewareSequence> =
  Simplify<AnalyzeHttpMiddlewareSequence<Middlewares>["context"]>;

/** Union of every error that a middleware sequence can return. */
export type HttpMiddlewareErrors<Middlewares extends HttpMiddlewareSequence> =
  AnalyzeHttpMiddlewareSequence<Middlewares>["errors"];

/** Ordered tuple of reusable HTTP request middleware functions. */
export type HttpMiddlewareSequence = readonly HttpMiddlewareConstraint[];

/**
 * A framework-agnostic middleware executed after request parsing and before
 * request-schema validation.
 *
 * `RequiredContext` is the minimum context produced by preceding middleware.
 * A middleware returns only the new context fragment it owns. Returning an
 * error stops the sequence immediately; the adapter maps that error to the
 * response.
 */
export type HttpRequestMiddleware<
  RequiredContext extends object,
  AddedContext extends object,
  Error extends HttpMappedError,
> = (
  input: HttpRequestMiddlewareInput<RequiredContext>,
) => Promise<Result<AddedContext, Error>>;

/** Context available to a request middleware. */
export interface HttpRequestMiddlewareInput<Context extends object> {
  /** Context produced by the preceding middleware stages. */
  readonly context: Readonly<Context>;
  /** Canonical, parsed request snapshot shared by every middleware. */
  readonly payload: Readonly<HttpRequestPayload>;
}

type RuntimeMiddleware = (
  input: HttpRequestMiddlewareInput<Record<string, unknown>>,
) => Promise<Result<Record<string, unknown>, BaseError>>;

/** Runs middleware in tuple order and stops at the first error. */
export const executeHttpMiddlewareSequence = async <
  const Middlewares extends HttpMiddlewareSequence,
>(
  payload: Readonly<HttpRequestPayload>,
  middlewares: Middlewares & NoInfer<EnsureHttpMiddlewareSequence<Middlewares>>,
): Promise<
  Result<HttpMiddlewareContext<Middlewares>, HttpMiddlewareErrors<Middlewares>>
> => {
  let context: Record<string, unknown> = {};
  const stages = middlewares as unknown as readonly RuntimeMiddleware[];

  for (const stage of stages) {
    const result = await stage({ context, payload });

    if (result.isErr()) {
      return err(result.error as HttpMiddlewareErrors<Middlewares>);
    }

    for (const key of Object.keys(result.value)) {
      if (Object.prototype.hasOwnProperty.call(context, key)) {
        throw new Error(`Duplicate middleware context key: ${key}`);
      }
    }

    context = { ...context, ...result.value };
  }

  return ok(context as HttpMiddlewareContext<Middlewares>);
};

/** Derives context and errors while retaining the first sequence violation. */
type AnalyzeHttpMiddlewareSequence<
  Middlewares extends HttpMiddlewareSequence,
  AccumulatedContext extends object = EmptyHttpMiddlewareContext,
  AccumulatedErrors = never,
  FirstIssueFound = never,
> = number extends Middlewares["length"]
  ? MiddlewareSequenceAnalysis<
      AccumulatedContext,
      AccumulatedErrors | MiddlewareContract<Middlewares[number]>["error"],
      FirstIssue<FirstIssueFound, TupleRequiredIssue>
    >
  : Middlewares extends readonly [
        infer Middleware extends HttpMiddlewareSequence[number],
        ...infer Remaining extends HttpMiddlewareSequence,
      ]
    ? AnalyzeHttpMiddlewareSequence<
        Remaining,
        AccumulatedContext & MiddlewareContract<Middleware>["addedContext"],
        AccumulatedErrors | MiddlewareContract<Middleware>["error"],
        FirstIssue<
          FirstIssueFound,
          MiddlewareIssue<AccumulatedContext, Middleware>
        >
      >
    : MiddlewareSequenceAnalysis<
        AccumulatedContext,
        AccumulatedErrors,
        FirstIssueFound
      >;

interface DuplicateContextIssue {
  readonly "ERROR_TS: middleware context keys must be unique": never;
}

type FirstIssue<Current, Candidate> = [Current] extends [never]
  ? Candidate
  : Current;

/**
 * Structural constraint used for `HttpMiddlewareSequence`. It uses a bivariance
 * hack so that middlewares with narrower context/error types can be stored in
 * a heterogeneous tuple while still being checked positionally.
 */
type HttpMiddlewareConstraint = {
  bivarianceHack(
    input: HttpRequestMiddlewareInput<object>,
  ): Promise<Result<object, HttpMappedError>>;
}["bivarianceHack"];

/** Type-level contract declared by one middleware. */
type MiddlewareContract<Middleware> =
  Middleware extends HttpRequestMiddleware<
    infer RequiredContext,
    infer AddedContext,
    infer Error
  >
    ? {
        addedContext: AddedContext;
        error: Error;
        requiredContext: RequiredContext;
      }
    : never;

type MiddlewareIssue<
  Context extends object,
  Middleware,
> = Context extends MiddlewareContract<Middleware>["requiredContext"]
  ? Extract<
      keyof Context,
      keyof MiddlewareContract<Middleware>["addedContext"]
    > extends never
    ? never
    : DuplicateContextIssue
  : MissingContextIssue;

interface MiddlewareSequenceAnalysis<Context extends object, Errors, Issue> {
  context: Context;
  errors: Errors;
  issue: Issue;
}

interface MissingContextIssue {
  readonly "ERROR_TS: middleware requires context unavailable at this position": never;
}

type Simplify<Value> = { [Key in keyof Value]: Value[Key] };

interface TupleRequiredIssue {
  readonly "ERROR_TS: middlewares must be a readonly tuple": never;
}
