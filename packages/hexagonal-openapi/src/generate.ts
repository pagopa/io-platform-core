import type {
  ResponseConfig,
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
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import {
  assertResponseCategories,
  assertSupportedResponseHeaders,
  getEntryDescription,
  getEntryHeaders,
  getEntrySchema,
  isNoBodyStatus,
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

/** Top-level config accepted by the v3.0 generator (excluding `openapi`). */
type OpenApiTopLevelConfig = Omit<
  Parameters<OpenApiGeneratorV3["generateDocument"]>[0],
  "openapi"
>;

const rewriteRequestRefs = (
  document: ReturnType<OpenApiGeneratorV3["generateDocument"]>,
  rewrite: (value: unknown) => unknown,
): void => {
  if (document.components?.parameters)
    document.components.parameters = rewrite(
      document.components.parameters,
    ) as typeof document.components.parameters;
  if (document.components?.requestBodies)
    document.components.requestBodies = rewrite(
      document.components.requestBodies,
    ) as typeof document.components.requestBodies;
  for (const path of Object.values(document.paths ?? {})) {
    if (!path) continue;
    if (path.parameters)
      path.parameters = rewrite(path.parameters) as typeof path.parameters;
    for (const method of ["get", "post", "put", "patch", "delete"] as const) {
      const operation = path[method];
      if (!operation) continue;
      if (operation.parameters)
        operation.parameters = rewrite(
          operation.parameters,
        ) as typeof operation.parameters;
      if (operation.requestBody)
        operation.requestBody = rewrite(
          operation.requestBody,
        ) as typeof operation.requestBody;
    }
  }
};

/** Preserve request input components when a named response has a different output. */
const separateResponseComponents = (
  document: ReturnType<OpenApiGeneratorV3["generateDocument"]>,
  definitions: OpenAPIRegistry["definitions"],
): void => {
  const schemas = document.components?.schemas;
  if (!schemas) return;
  const outputs = new Map<string, unknown>();
  for (const definition of definitions) {
    if (
      definition.type === "component" &&
      definition.componentType === "schemas"
    ) {
      outputs.set(definition.name, definition.component);
    }
  }
  const aliases = new Map<string, string>();
  const reserve = (name: string) => {
    if (aliases.has(name)) return;
    let alias = `${name}Input`;
    for (
      let n = 2;
      alias in schemas || [...aliases.values()].includes(alias);
      n++
    )
      alias = `${name}Input${n}`;
    aliases.set(name, alias);
  };
  for (const [name, output] of outputs) {
    if (
      schemas[name] &&
      JSON.stringify(schemas[name]) !== JSON.stringify(output)
    )
      reserve(name);
  }
  let size = -1;
  while (size !== aliases.size) {
    size = aliases.size;
    for (const [name, schema] of Object.entries(schemas)) {
      const serialized = JSON.stringify(schema);
      if (
        [...aliases.keys()].some((key) =>
          serialized.includes(JSON.stringify(`#/components/schemas/${key}`)),
        )
      )
        reserve(name);
    }
  }
  const rewrite = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(rewrite);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => {
        if (
          key === "$ref" &&
          typeof child === "string" &&
          child.startsWith("#/components/schemas/")
        ) {
          const name = child.slice("#/components/schemas/".length);
          if (aliases.has(name))
            return [key, `#/components/schemas/${aliases.get(name)}`];
        }
        return [key, rewrite(child)];
      }),
    );
  };
  for (const [name, alias] of aliases)
    schemas[alias] = rewrite(schemas[name]) as never;
  for (const [name, output] of outputs) schemas[name] = output as never;
  rewriteRequestRefs(document, rewrite);
};

const reserveComponentNames = (
  routes: GenerateOptions["routes"],
  registry: OpenAPIRegistry,
): Set<string> => {
  const reservedNames = new Set<string>();
  const reserveSchema = (schema: ZodType) => {
    for (const named of collectNamedSchemas(schema)) {
      const id = readSchemaId(named);
      if (id !== undefined) reservedNames.add(id);
    }
  };
  for (const definition of registry.definitions) {
    if (
      definition.type === "component" &&
      definition.componentType === "schemas"
    )
      reservedNames.add(definition.name);
    if (definition.type === "schema" || definition.type === "parameter")
      reserveSchema(definition.schema);
  }
  for (const contract of routes) {
    for (const schema of Object.values(contract.request))
      if (schema) reserveSchema(schema);
    for (const entry of Object.values(contract.response)) {
      const headers = getEntryHeaders(entry);
      if (headers) reserveSchema(headers);
      if (!isRedirectEntry(entry)) reserveSchema(getEntrySchema(entry));
    }
  }
  return reservedNames;
};

/**
 * Builds an OpenAPI 3.0.3 document from a list of route contracts plus top-level
 * metadata. Pure function: the same input always yields the same output.
 *
 * @param options Document metadata, routes and optional named schemas.
 * @returns The generated OpenAPI 3.0.3 document.
 */
export const buildOpenApiDocument = (
  options: GenerateOptions,
): ReturnType<OpenApiGeneratorV3["generateDocument"]> => {
  const registry = new OpenAPIRegistry();

  // Optional escape hatch for advanced registration (security schemes, …).
  options.registerComponents?.(registry);
  const initialDefinitions = registry.definitions.length;
  const reservedNames = reserveComponentNames(options.routes, registry);

  // Register each route. Schemas carrying `.meta({ id })` — including the
  // shared `ProblemDetails` — are auto-registered as reusable components and
  // referenced via `$ref`, so no explicit per-schema registration is needed.
  for (const contract of options.routes) {
    assertSupportedResponseHeaders(contract.response);
    assertResponseCategories(contract.response);
    registry.registerPath(toRouteConfig(contract, registry, reservedNames));
  }

  const document = new OpenApiGeneratorV3(registry.definitions, {
    unionPreferredType: "oneOf",
  }).generateDocument({
    ...options.document,
    openapi: "3.0.3",
  });
  separateResponseComponents(
    document,
    registry.definitions.slice(initialDefinitions),
  );
  for (const contract of options.routes) {
    const operation = document.paths?.[contract.path]?.[contract.method];
    for (const [status, entry] of Object.entries(contract.response)) {
      if (!isRedirectEntry(entry)) continue;
      const response = operation?.responses?.[status];
      if (!response || "$ref" in response || !response.headers) continue;
      const locationKey = Object.keys(response.headers).find(
        (key) => key.toLowerCase() === "location",
      );
      const header = locationKey && response.headers[locationKey];
      if (!header || "$ref" in header) continue;
      header.required = true;
      header.schema = {
        allOf: [
          ...(header.schema ? [header.schema] : []),
          { minLength: 1, type: "string" },
        ],
      };
    }
  }
  return document;
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
 * annotation from the given schema tree. Useful when you want to register
 * named component schemas explicitly through the `registerComponents` hook.
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
    if (isZodLike(def.out)) visit(def.out);
    if (def.type === "lazy") visit(_zod?.innerType);
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
  if (override !== undefined && override.length > 0) return override;
  if (status >= 200 && status < 300) {
    return status === 204
      ? "No Content"
      : `Successful response for ${operationId}`;
  }
  return HTTP_STATUS_TEXTS[status] ?? `HTTP ${status}`;
};

const outputFormats: Record<string, string> = {
  cuid: "cuid",
  cuid2: "cuid2",
  date: "date",
  datetime: "date-time",
  email: "email",
  emoji: "emoji",
  guid: "uuid",
  ipv4: "ipv4",
  ipv6: "ipv6",
  ulid: "ulid",
  url: "uri",
  uuid: "uuid",
};

// Compare against Zod's own default patterns, not every pattern on a format check.
const defaultFormatPatterns: Record<string, RegExp> = {
  cuid: z.core.regexes.cuid,
  cuid2: z.core.regexes.cuid2,
  date: z.core.regexes.date,
  datetime: z.core.regexes.datetime({}),
  email: z.core.regexes.email,
  emoji: z.core.regexes.emoji(),
  guid: z.core.regexes.guid,
  ipv4: z.core.regexes.ipv4,
  ipv6: z.core.regexes.ipv6,
  ulid: z.core.regexes.ulid,
  uuid: z.core.regexes.uuid(),
};

type OutputOverrideContext = Parameters<
  NonNullable<z.core.ToJSONSchemaParams["override"]>
>[0];

const compactPatterns = (
  jsonSchema: OutputOverrideContext["jsonSchema"],
  builtInPatterns: Set<string>,
) => {
  const remaining = jsonSchema.allOf?.filter(
    (item) =>
      !(
        Object.keys(item).length === 1 &&
        item.pattern !== undefined &&
        builtInPatterns.has(item.pattern)
      ),
  );
  if (!remaining) return;
  if (remaining.length === 0) delete jsonSchema.allOf;
  else jsonSchema.allOf = remaining;
};

const applyStringFormat = (
  {
    jsonSchema,
    zodSchema,
  }: Pick<OutputOverrideContext, "jsonSchema" | "zodSchema">,
  format: string | undefined,
  builtInPatterns: Set<string>,
) => {
  const metadata = z.globalRegistry.get(zodSchema);
  if (!jsonSchema.format && format && metadata?.format === undefined)
    jsonSchema.format = format;
  if (jsonSchema.format !== format) return;
  if (
    metadata?.pattern === undefined &&
    jsonSchema.pattern !== undefined &&
    builtInPatterns.has(jsonSchema.pattern)
  )
    delete jsonSchema.pattern;
  if (metadata?.allOf === undefined)
    compactPatterns(jsonSchema, builtInPatterns);
};

const leanStringOutput = ({ jsonSchema, zodSchema }: OutputOverrideContext) => {
  const def = zodSchema._zod.def;
  if (def.type !== "string") return;
  const context = { jsonSchema, zodSchema };
  const checks = [def, ...(def.checks ?? []).map((check) => check._zod.def)];
  const candidates = new Map<string, string>();
  const explicitPatterns = new Set<string>();
  let format: string | undefined;
  for (const check of checks) {
    if (!("format" in check) || typeof check.format !== "string") continue;
    const regex =
      "pattern" in check && check.pattern instanceof RegExp
        ? check.pattern
        : undefined;
    const pattern = regex?.source;
    if (check.format === "regex" && pattern) explicitPatterns.add(pattern);
    if (outputFormats[check.format]) {
      format = outputFormats[check.format];
      const defaultPattern = defaultFormatPatterns[check.format];
      if (
        pattern &&
        defaultPattern &&
        regex?.source === defaultPattern.source &&
        regex.flags === defaultPattern.flags
      )
        candidates.set(pattern, format);
    }
  }
  const builtInPatterns = new Set(
    [...candidates]
      .filter(
        ([pattern, candidateFormat]) =>
          candidateFormat === format && !explicitPatterns.has(pattern),
      )
      .map(([pattern]) => pattern),
  );
  const before = [
    jsonSchema.pattern,
    ...(jsonSchema.allOf ?? []).map((item) => item.pattern),
  ];
  applyStringFormat(context, format, builtInPatterns);
  const after = [
    jsonSchema.pattern,
    ...(jsonSchema.allOf ?? []).map((item) => item.pattern),
  ];
  return {
    format,
    patterns: before.filter(
      (pattern): pattern is string =>
        pattern !== undefined &&
        builtInPatterns.has(pattern) &&
        !after.includes(pattern),
    ),
  };
};

const tighterBound = (
  current: undefined | { inclusive: boolean; value: number },
  candidate: { inclusive: boolean; value: number },
  side: "maximum" | "minimum",
) =>
  !current ||
  (side === "minimum"
    ? candidate.value > current.value
    : candidate.value < current.value) ||
  (candidate.value === current.value && !candidate.inclusive);

const applyIntegerBound = (
  { jsonSchema, zodSchema }: OutputOverrideContext,
  side: "maximum" | "minimum",
  bound: undefined | { inclusive: boolean; value: number },
) => {
  const exclusive =
    side === "minimum" ? "exclusiveMinimum" : "exclusiveMaximum";
  const metadata = z.globalRegistry.get(zodSchema);
  if (side === "minimum") {
    if (metadata?.minimum === undefined) delete jsonSchema.minimum;
    if (metadata?.exclusiveMinimum === undefined)
      delete jsonSchema.exclusiveMinimum;
  } else {
    if (metadata?.maximum === undefined) delete jsonSchema.maximum;
    if (metadata?.exclusiveMaximum === undefined)
      delete jsonSchema.exclusiveMaximum;
  }
  if (bound) {
    const key = bound.inclusive ? side : exclusive;
    if (metadata?.[key] === undefined) jsonSchema[key] = bound.value;
  }
};

const explicitIntegerBound = (
  context: OutputOverrideContext,
  side: "maximum" | "minimum",
) => {
  const def = context.zodSchema._zod.def;
  if (def.type !== "number") return;
  let bound: undefined | { inclusive: boolean; value: number };
  for (const check of def.checks ?? []) {
    const constraint = check._zod.def;
    if (
      constraint.check !==
        (side === "minimum" ? "greater_than" : "less_than") ||
      !("value" in constraint) ||
      typeof constraint.value !== "number" ||
      !("inclusive" in constraint) ||
      typeof constraint.inclusive !== "boolean"
    )
      continue;
    const candidate = {
      inclusive: constraint.inclusive,
      value: constraint.value,
    };
    if (tighterBound(bound, candidate, side)) bound = candidate;
  }
  applyIntegerBound(context, side, bound);
};

type RemovedPatterns = WeakMap<
  z.core.$ZodType,
  { format: string | undefined; patterns: string[] }
>;

const wrappedOutput = (zodSchema: OutputOverrideContext["zodSchema"]) => {
  const def = zodSchema._zod.def;
  if (def.type === "lazy") return (zodSchema as z.core.$ZodLazy)._zod.innerType;
  if (def.type === "pipe") return def.out;
  if (
    def.type === "optional" ||
    def.type === "nonoptional" ||
    def.type === "default" ||
    def.type === "prefault" ||
    def.type === "catch" ||
    def.type === "readonly" ||
    def.type === "promise"
  )
    return def.innerType;
};

const applyWrappedFormat = (
  { jsonSchema, zodSchema }: OutputOverrideContext,
  removed: RemovedPatterns,
) => {
  const inner = wrappedOutput(zodSchema);
  const inherited = inner && removed.get(inner);
  if (!inherited) return;
  removed.set(zodSchema, inherited);
  const format = jsonSchema.format ?? z.globalRegistry.get(zodSchema)?.format;
  if (format === undefined || format === inherited.format) return;
  for (const pattern of inherited.patterns) {
    if (
      jsonSchema.pattern === pattern ||
      jsonSchema.allOf?.some((item) => item.pattern === pattern)
    )
      continue;
    if (jsonSchema.pattern === undefined) jsonSchema.pattern = pattern;
    else jsonSchema.allOf = [...(jsonSchema.allOf ?? []), { pattern }];
  }
};

// Match zod-to-openapi's compact defaults without changing the source schemas.
// Remember removed patterns while Zod flattens wrappers, which may change format.
const leanOutput = (): NonNullable<z.core.ToJSONSchemaParams["override"]> => {
  const removed: RemovedPatterns = new WeakMap();
  return (context) => {
    const { jsonSchema, zodSchema } = context;
    const def = zodSchema._zod.def;
    if (def.type === "object" && !def.catchall) {
      if (z.globalRegistry.get(zodSchema)?.additionalProperties === undefined)
        delete jsonSchema.additionalProperties;
    } else if (def.type === "string") {
      const result = leanStringOutput(context);
      if (result?.patterns.length) removed.set(zodSchema, result);
    } else if (
      def.type === "number" &&
      zodSchema._zod.bag.format === "safeint"
    ) {
      explicitIntegerBound(context, "minimum");
      explicitIntegerBound(context, "maximum");
    } else applyWrappedFormat(context, removed);
  };
};

/** Generate output JSON Schema without executing response decoders. */
const responseOutput = (
  schema: z.ZodObject,
  registry: OpenAPIRegistry,
  operationId: string,
  status: string,
  part: "body" | "headers",
  reservedNames: Set<string>,
) => {
  const output = (() => {
    try {
      return z.toJSONSchema(schema, { io: "output", override: leanOutput() });
    } catch (error) {
      throw new Error(
        `Cannot document output ${part} for ${operationId} (${status}): ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  })();
  const named = new Set(collectNamedSchemas(schema).map(readSchemaId));
  const names = new Map<string, string>();
  for (const id of Object.keys(output.$defs ?? {})) {
    if (named.has(id)) {
      names.set(id, id);
      continue;
    }
    let name = id;
    for (let n = 1; reservedNames.has(name); n++) name = `${id}_${n}`;
    reservedNames.add(name);
    names.set(id, name);
  }
  const refs = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(refs);
    if (typeof value !== "object" || value === null) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [
        key,
        key === "$ref" &&
        typeof child === "string" &&
        child.startsWith("#/$defs/")
          ? `#/components/schemas/${names.get(child.slice("#/$defs/".length)) ?? child.slice("#/$defs/".length)}`
          : refs(child),
      ]),
    );
  };
  for (const [id, definition] of Object.entries(output.$defs ?? {})) {
    registry.registerComponent(
      "schemas",
      names.get(id) ?? id,
      refs(definition) as never,
    );
  }
  return {
    properties: refs(output.properties ?? {}) as Record<string, object>,
    required: new Set(output.required ?? []),
  };
};

const responseHeaders = (
  schema: z.ZodObject,
  registry: OpenAPIRegistry,
  operationId: string,
  status: string,
  reservedNames: Set<string>,
): NonNullable<ResponseConfig["headers"]> => {
  const { properties, required } = responseOutput(
    schema,
    registry,
    operationId,
    status,
    "headers",
    reservedNames,
  );
  return Object.fromEntries(
    Object.entries(properties).map(([name, property]) => [
      name,
      { required: required.has(name), schema: property },
    ]),
  ) as NonNullable<ResponseConfig["headers"]>;
};

const routeRequest = (
  contract: AnyRouteContract,
): NonNullable<RouteConfig["request"]> => {
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
  return request;
};

const toRouteConfig = (
  contract: AnyRouteContract,
  registry: OpenAPIRegistry,
  reservedNames: Set<string>,
): RouteConfig => {
  const responses: RouteConfig["responses"] = {};

  for (const [statusStr, entry] of Object.entries(contract.response)) {
    const status = Number(statusStr);
    const typedEntry = entry as ResponseEntry;

    const declaredHeaders = getEntryHeaders(typedEntry);
    const redirect = isRedirectEntry(typedEntry);
    const headerSchema =
      redirect &&
      !Object.keys(declaredHeaders?.shape ?? {}).some(
        (key) => key.toLowerCase() === "location",
      )
        ? (declaredHeaders ?? z.object({})).extend({
            location: z.string().min(1),
          })
        : declaredHeaders;
    const headers = headerSchema
      ? responseHeaders(
          headerSchema,
          registry,
          contract.operationId,
          statusStr,
          reservedNames,
        )
      : undefined;
    const description = responseDescription(
      status,
      typedEntry,
      contract.operationId,
    );
    if (redirect || isNoBodyStatus(status)) {
      responses[statusStr] = { description, ...(headers ? { headers } : {}) };
      continue;
    }
    const schema = getEntrySchema(typedEntry);
    const bodySchema =
      status >= 200 && status < 300
        ? responseOutput(
            z.object({ body: schema }),
            registry,
            contract.operationId,
            statusStr,
            "body",
            reservedNames,
          ).properties.body
        : schema;
    responses[statusStr] = {
      content: {
        [status >= 200 && status < 300
          ? "application/json"
          : "application/problem+json"]: { schema: bodySchema as never },
      },
      description,
      ...(headers ? { headers } : {}),
    };
  }

  return {
    description: contract.description,
    method: methodToOpenApi[contract.method],
    operationId: contract.operationId,
    path: contract.path,
    request: routeRequest(contract),
    responses,
    security: contract.security?.map((s) =>
      Object.fromEntries(Object.entries(s).map(([k, v]) => [k, [...v]])),
    ),
    summary: contract.summary,
    tags: contract.tags ? [...contract.tags] : undefined,
  };
};
