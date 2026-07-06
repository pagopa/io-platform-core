import type {
  RouteConfig,
  ZodRequestBody,
} from "@asteasolutions/zod-to-openapi";
import type {
  HttpMethod,
  ResponseEntry,
  ResponseMap,
  RouteContract,
  RouteRequestSchemas,
} from "@pagopa/hexagonal-core/adapters";

import {
  extendZodWithOpenApi,
  OpenApiGeneratorV31,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import {
  getEntryDescription,
  getEntrySchema,
  isRedirectEntry,
} from "@pagopa/hexagonal-core/adapters";
import { z, type ZodType } from "zod";

// Enable the `.openapi()` extension on every Zod schema. Idempotent.
extendZodWithOpenApi(z);

/**
 * A contract erased of its precise generic parameters. Useful to store a
 * heterogeneous list of contracts in a single array for the generator.
 */
export type AnyRouteContract = RouteContract<RouteRequestSchemas, ResponseMap>;

/** Options accepted by {@link buildOpenApiDocument}. */
export interface GenerateOptions {
  /** OpenAPI top-level document configuration (title, version, servers, …). */
  document: OpenApiTopLevelConfig;
  /**
   * Hook to register additional components (security schemes, parameters, …)
   * on the underlying registry before generation runs.
   */
  registerComponents?: (registry: OpenAPIRegistry) => void;
  /** Route contracts to expose in the spec. */
  routes: readonly AnyRouteContract[];
}

/** Top-level config accepted by the v3.1 generator (excluding `openapi`). */
type OpenApiTopLevelConfig = Omit<
  Parameters<OpenApiGeneratorV31["generateDocument"]>[0],
  "openapi"
>;

/**
 * Builds an OpenAPI 3.1 document from a list of route contracts plus top-level
 * metadata. Pure function: the same input always yields the same output.
 *
 * @param options Document metadata, routes and optional named schemas.
 * @returns The generated OpenAPI 3.1 document.
 */
export const buildOpenApiDocument = (
  options: GenerateOptions,
): ReturnType<OpenApiGeneratorV31["generateDocument"]> => {
  const registry = new OpenAPIRegistry();

  // Optional escape hatch for advanced registration (security schemes, …).
  options.registerComponents?.(registry);

  // Register each route. Schemas carrying `.meta({ id })` — including the
  // shared `ProblemDetails` — are auto-registered as reusable components and
  // referenced via `$ref`, so no explicit per-schema registration is needed.
  for (const contract of options.routes) {
    registry.registerPath(toRouteConfig(contract));
  }

  return new OpenApiGeneratorV31(registry.definitions, {
    unionPreferredType: "oneOf",
  }).generateDocument({
    openapi: "3.1.0",
    ...options.document,
  });
};

/** Reads the `.meta({ id })` annotation of a schema, if any. */
export const readSchemaId = (schema: ZodType): string | undefined => {
  const meta = (
    schema as { meta?: () => undefined | { id?: string } }
  ).meta?.();
  return meta?.id;
};

/**
 * Recursively collects every Zod schema that carries a `.meta({ id })`
 * annotation from the given schema tree. Used to auto-populate the
 * {@link RouteRegistry} with named component schemas.
 *
 * Traversal covers common Zod v4 constructs (object, optional/nullable/default,
 * pipe/transform, array, union, intersection) and uses a visited-set to avoid
 * infinite loops.
 *
 * @param root The schema tree to scan.
 * @returns Every named schema discovered (the root included, if named).
 */
export const collectNamedSchemas = (root: ZodType): readonly ZodType[] => {
  const result: ZodType[] = [];
  const visited = new Set<object>();

  const visit = (schema: unknown): void => {
    if (!isZodLike(schema) || visited.has(schema as object)) return;
    visited.add(schema as object);

    const id = readSchemaId(schema as ZodType);
    if (id !== undefined) result.push(schema as ZodType);

    // Access Zod v4 internal `_zod.def`.
    const _zod = (schema as Record<string, unknown>)._zod as
      | Record<string, unknown>
      | undefined;
    const def = _zod?.def as Record<string, unknown> | undefined;
    if (!def) return;

    // ZodObject – traverse shape properties. Zod v4 exposes `shape` as a plain
    // object; some builds expose it as a getter function, so handle both.
    const shape =
      typeof def.shape === "function"
        ? (def.shape as () => Record<string, unknown>)()
        : (def.shape as Record<string, unknown> | undefined);
    if (shape !== undefined && typeof shape === "object") {
      for (const child of Object.values(shape)) visit(child);
    }

    // ZodPipe / transform – traverse the input side.
    if (isZodLike(def.in)) visit(def.in);
    // ZodOptional, ZodNullable, ZodDefault – traverse inner type.
    if (isZodLike(def.innerType)) visit(def.innerType);
    // ZodArray – traverse element schema.
    if (isZodLike(def.element)) visit(def.element);
    // ZodUnion / ZodDiscriminatedUnion – traverse all options.
    if (Array.isArray(def.options)) {
      for (const opt of def.options) visit(opt);
    }
    // ZodIntersection – traverse both sides.
    if (isZodLike(def.left)) visit(def.left);
    if (isZodLike(def.right)) visit(def.right);
  };

  visit(root);
  return result;
};

const isZodLike = (value: unknown): boolean =>
  typeof value === "object" && value !== null && "~standard" in value;

const methodToOpenApi: Record<HttpMethod, RouteConfig["method"]> = {
  delete: "delete",
  get: "get",
  patch: "patch",
  post: "post",
  put: "put",
};

const HTTP_STATUS_TEXTS: Partial<Record<number, string>> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  412: "Precondition Failed",
  422: "Unprocessable Entity",
  500: "Internal Server Error",
};

const responseDescription = (
  status: number,
  entry: ResponseEntry,
  operationId: string,
): string => {
  const override = getEntryDescription(entry);
  if (override !== undefined) return override;
  if (status >= 200 && status < 300) {
    return status === 204
      ? "No Content"
      : `Successful response for ${operationId}`;
  }
  return HTTP_STATUS_TEXTS[status] ?? `HTTP ${status}`;
};

const toRouteConfig = (contract: AnyRouteContract): RouteConfig => {
  const responses: RouteConfig["responses"] = {};

  for (const [statusStr, entry] of Object.entries(contract.response)) {
    const status = Number(statusStr);
    const typedEntry = entry as ResponseEntry;

    if (isRedirectEntry(typedEntry)) {
      const redirectHeaders = typedEntry.headers
        ? Object.fromEntries(
            Object.entries(typedEntry.headers).map(([name, def]) => [
              name,
              {
                schema: def.schema,
                ...(def.description !== undefined
                  ? { description: def.description }
                  : {}),
              },
            ]),
          )
        : undefined;
      (responses as Record<string, unknown>)[statusStr] = {
        description: typedEntry.description,
        ...(redirectHeaders !== undefined ? { headers: redirectHeaders } : {}),
      };
      continue;
    }

    const schema = getEntrySchema(typedEntry);
    const description = responseDescription(
      status,
      typedEntry,
      contract.operationId,
    );

    if (status >= 200 && status < 300) {
      responses[statusStr] = {
        content: { "application/json": { schema } },
        description,
      };
    } else {
      responses[statusStr] = {
        content: { "application/problem+json": { schema } },
        description,
      };
    }
  }

  const request: NonNullable<RouteConfig["request"]> = {};
  if (contract.request.body) {
    request.body = {
      content: { "application/json": { schema: contract.request.body } },
      required: true,
    } satisfies ZodRequestBody;
  }
  if (contract.request.headers) request.headers = contract.request.headers;
  if (contract.request.path) request.params = contract.request.path;
  if (contract.request.query) request.query = contract.request.query;

  return {
    description: contract.description,
    method: methodToOpenApi[contract.method],
    operationId: contract.operationId,
    path: contract.path,
    request,
    responses,
    security: contract.security?.map((s) =>
      Object.fromEntries(Object.entries(s).map(([k, v]) => [k, [...v]])),
    ),
    summary: contract.summary,
    tags: contract.tags ? [...contract.tags] : undefined,
  };
};
