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

// --- Dependency wiring ---

const userProfileRepository = new InMemoryUserProfileRepository();
const getUserProfileUseCase = makeGetUserProfileUseCase(userProfileRepository);
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

const server = fastify();

mountInfoHandler(server, getInfoUseCase);

mountGetUserProfileHandler(server, getUserProfileUseCase);

mountCreateUserProfileHandler(server, createUserProfileUseCase);

mountUpdateUserProfileHandler(server, updateUserProfileUseCase);

mountDeleteUserProfileHandler(server, deleteUserProfileUseCase);

// Avvio del server
const start = async () => {
  try {
    await server.listen({ port: 7071 });
    console.log("Server listening on http://localhost:7071");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
