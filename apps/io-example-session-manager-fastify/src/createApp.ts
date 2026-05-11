import type { FastifyInstance } from "fastify";

import { RouteRegistry } from "@pagopa/io-core-openapi";
import fastify from "fastify";

import {
  mountAcsHandler,
  mountFastLoginHandler,
  mountGenerateNonceHandler,
  mountGetSessionHandler,
  mountGetUserIdentityHandler,
  mountHealthcheckHandler,
  mountLoginHandler,
  mountLogoutHandler,
  mountMetadataHandler,
  mountTestLoginHandler,
} from "./adapters/inbound/fastify/index.js";
import { acsUseCase } from "./application/use-cases/acs.use-case.js";
import { fastLoginUseCase } from "./application/use-cases/fast-login.use-case.js";
import { generateNonceUseCase } from "./application/use-cases/generate-nonce.use-case.js";
import { getSessionUseCase } from "./application/use-cases/get-session.use-case.js";
import { getUserIdentityUseCase } from "./application/use-cases/get-user-identity.use-case.js";
import { healthcheckUseCase } from "./application/use-cases/healthcheck.use-case.js";
import { loginUseCase } from "./application/use-cases/login.use-case.js";
import { logoutUseCase } from "./application/use-cases/logout.use-case.js";
import { metadataUseCase } from "./application/use-cases/metadata.use-case.js";
import { testLoginUseCase } from "./application/use-cases/test-login.use-case.js";

export const createApp = (): {
  registry: RouteRegistry;
  server: FastifyInstance;
} => {
  const server = fastify();
  const registry = new RouteRegistry();

  // --- HTTP function registrations ---

  mountFastLoginHandler(server, fastLoginUseCase, registry);
  mountGenerateNonceHandler(server, generateNonceUseCase, registry);
  mountGetSessionHandler(server, getSessionUseCase, registry);
  mountLogoutHandler(server, logoutUseCase, registry);
  mountLoginHandler(server, loginUseCase, registry);
  mountTestLoginHandler(server, testLoginUseCase, registry);
  mountHealthcheckHandler(server, healthcheckUseCase, registry);
  mountAcsHandler(server, acsUseCase, registry);
  mountMetadataHandler(server, metadataUseCase, registry);
  mountGetUserIdentityHandler(server, getUserIdentityUseCase, registry);

  return { registry, server };
};
