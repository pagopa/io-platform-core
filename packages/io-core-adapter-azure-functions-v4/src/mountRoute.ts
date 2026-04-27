import type { InputValidator, UseCase } from "@pagopa/io-core-domain";
import type { BaseError } from "@pagopa/io-core-domain/errors";
import type {
  EnsureResponseCoversErrors,
  ResponseMap,
  RouteContract,
  RouteRequestSchemas,
  SuccessSchemaFromMap,
  WireRequest,
} from "@pagopa/io-core-openapi";
import type { RouteRegistry } from "@pagopa/io-core-openapi";
import type { z, ZodType } from "zod";

import {
  app,
  type HttpMethod as AzHttpMethod,
  type HttpRequest,
} from "@azure/functions";
import { z as zod } from "zod";

import { collectNamedSchemas, getEntrySchema } from "@pagopa/io-core-openapi";

import { createHttpResponseFormatter } from "./formatter/httpOutputStandardSchemaFormatter.js";
import { createHttpHandler } from "./httpHandlerBuilder.js";
import { createHttpRequestValidator } from "./validator/httpInputStandardSchemaValidator.js";

const buildWireSchema = (request: RouteRequestSchemas) =>
  zod.object({
    body: request.body ?? zod.unknown(),
    headers: request.headers ?? zod.unknown(),
    path: request.path ?? zod.unknown(),
    query: request.query ?? zod.unknown(),
  });

const azureMethod: Record<string, AzHttpMethod> = {
  delete: "DELETE",
  get: "GET",
  patch: "PATCH",
  post: "POST",
  put: "PUT",
};

const SUCCESS_STATUSES = new Set([200, 201, 202, 204]);

type SuccessStatusCode = 200 | 201 | 202 | 204;

const getSuccessEntry = (
  response: ResponseMap,
): { schema: ZodType; status: SuccessStatusCode } => {
  for (const [key, entry] of Object.entries(response)) {
    const status = Number(key);
    if (SUCCESS_STATUSES.has(status)) {
      return {
        schema: getEntrySchema(entry),
        status: status as SuccessStatusCode,
      };
    }
  }
  throw new Error(
    "mountFunctionsRoute: no 2xx entry found in response map. " +
      "Add a 200/201/202/204 entry to the contract response.",
  );
};

const registerContractSchemas = (
  contract: RouteContract<RouteRequestSchemas, ResponseMap>,
  registry: RouteRegistry,
): void => {
  const schemasToScan: ZodType[] = [];

  for (const entry of Object.values(contract.response)) {
    schemasToScan.push(getEntrySchema(entry));
  }

  for (const schema of [
    contract.request.body,
    contract.request.headers,
    contract.request.path,
    contract.request.query,
  ]) {
    if (schema) schemasToScan.push(schema);
  }

  for (const root of schemasToScan) {
    for (const named of collectNamedSchemas(root)) {
      registry.addSchema(named);
    }
  }
};

/**
 * Mounts a route contract on the Azure Functions v4 app, applying the same
 * compile-time guarantees as the Fastify counterpart. See
 * `@pagopa/io-core-adapter-fastify`'s `mountFastifyRoute` for details.
 *
 * The contract path is interpreted as a Functions `route` template (no
 * leading slash, parameter syntax `{name}`). Pass `routeFromContractPath`
 * to derive it from a `/api/...` style contract path.
 */
export const mountFunctionsRoute = <
  Req extends RouteRequestSchemas,
  const Resp extends ResponseMap,
  UseCaseInput extends object,
  E extends BaseError,
>(spec: {
  authLevel?: "admin" | "anonymous" | "function";
  contract: RouteContract<Req, Resp>;
  /**
   * Functions function name (must be unique). Defaults to the contract
   * `operationId`.
   */
  functionName?: string;
  registry?: RouteRegistry;
  transformInput: (req: WireRequest<Req>) => UseCaseInput;
  useCase: NoInfer<EnsureResponseCoversErrors<E, Resp>> &
    UseCase<UseCaseInput, z.input<SuccessSchemaFromMap<Resp>>, E>;
}): void => {
  if (spec.registry) {
    spec.registry.add(
      spec.contract as unknown as Parameters<RouteRegistry["add"]>[0],
    );
    registerContractSchemas(
      spec.contract as RouteContract<RouteRequestSchemas, ResponseMap>,
      spec.registry,
    );
  }

  const { schema: successSchema, status: successCode } = getSuccessEntry(
    spec.contract.response as ResponseMap,
  );

  const wire = buildWireSchema(spec.contract.request).transform((parts) =>
    spec.transformInput(parts as WireRequest<Req>),
  );

  const validator = createHttpRequestValidator(
    wire as unknown as Parameters<typeof createHttpRequestValidator>[0],
  ) as InputValidator<HttpRequest, UseCaseInput>;
  const formatter = createHttpResponseFormatter(successSchema);
  const handler = createHttpHandler(
    spec.useCase as UseCase<
      UseCaseInput,
      z.input<SuccessSchemaFromMap<Resp>>,
      E
    >,
    validator,
    formatter,
    { successCode },
  );

  app.http(spec.functionName ?? spec.contract.operationId, {
    authLevel: spec.authLevel ?? "function",
    handler,
    methods: [azureMethod[spec.contract.method]],
    route: routeFromContractPath(spec.contract.path),
  });
};

/**
 * Strips the leading "/api/" (Azure Functions adds it back via `routePrefix`)
 * and converts `:param` placeholders to `{param}` if any.
 */
export const routeFromContractPath = (path: string): string => {
  const stripped = path.replace(/^\/api\//, "").replace(/^\//, "");
  return stripped.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
};
