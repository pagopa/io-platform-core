import type { FastifyInstance } from "fastify";

import { RouteRegistry } from "@pagopa/io-core-openapi";
import fastify from "fastify";

import {
  mountCreateUserProfileHandler,
  mountDeleteUserProfileHandler,
  mountGetUserProfileHandler,
  mountInfoHandler,
  mountUpdateUserProfileHandler,
} from "./adapters/inbound/fastify/index.js";
import { InMemoryUserProfileRepository } from "./adapters/outbound/persistence/in-memory-user-profile.repository.js";
import { makeCreateUserProfileUseCase } from "./application/use-cases/create-user-profile.use-case.js";
import { makeDeleteUserProfileUseCase } from "./application/use-cases/delete-user-profile.use-case.js";
import { makeGetUserProfileUseCase } from "./application/use-cases/get-user-profile.use-case.js";
import { getInfoUseCase } from "./application/use-cases/info.use-case.js";
import { makeUpdateUserProfileUseCase } from "./application/use-cases/update-user-profile.use-case.js";

export const createApp = (): {
  registry: RouteRegistry;
  server: FastifyInstance;
} => {
  const server = fastify();
  const registry = new RouteRegistry();

  // --- Dependency wiring ---

  const userProfileRepository = new InMemoryUserProfileRepository();
  const getUserProfileUseCase = makeGetUserProfileUseCase(
    userProfileRepository,
  );
  const createUserProfileUseCase = makeCreateUserProfileUseCase(
    userProfileRepository,
  );
  const updateUserProfileUseCase = makeUpdateUserProfileUseCase(
    userProfileRepository,
  );
  const deleteUserProfileUseCase = makeDeleteUserProfileUseCase(
    userProfileRepository,
  );

  // --- HTTP function registrations ---

  mountInfoHandler(server, getInfoUseCase, registry);
  mountGetUserProfileHandler(server, getUserProfileUseCase, registry);
  mountCreateUserProfileHandler(server, createUserProfileUseCase, registry);
  mountUpdateUserProfileHandler(server, updateUserProfileUseCase, registry);
  mountDeleteUserProfileHandler(server, deleteUserProfileUseCase, registry);

  return { registry, server };
};
