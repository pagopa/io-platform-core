import fastifySwagger from "@fastify/swagger";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import fastify from "fastify";

import {
  mountCreateUserProfileHandler,
  mountDeleteUserProfileHandler,
  mountGetUserProfileHandler,
  mountInfoHandler,
  mountUpdateUserProfileHandler,
} from "./adapters/inbound/fastify/index.js";
import {
  registerSharedSchemas,
  type SharedSchemaReferences,
} from "./adapters/inbound/fastify/schemas/shared.schemas.js";
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

const server = fastify().withTypeProvider<
  JsonSchemaToTsProvider<{
    ValidatorSchemaOptions: { references: SharedSchemaReferences };
    SerializerSchemaOptions: {
      references: SharedSchemaReferences;
      deserialize: [
        { pattern: { type: "string"; format: "date-time" }; output: Date },
        { pattern: { type: "string"; format: "date" }; output: Date },
      ];
    };
  }>
>();

// Register OpenAPI generation plugin
await server.register(fastifySwagger, {
  openapi: {
    info: {
      description:
        "Example Fastify app following the hexagonal architecture pattern.",
      license: { identifier: "MIT", name: "MIT" },
      title: "io-example-fastify",
      version: "0.0.1",
    },
    openapi: "3.1.0",
    servers: [
      {
        description: "Local development server",
        url: "http://localhost:7071/api",
      },
    ],
  },
  refResolver: {
    buildLocalReference: (json) => json.$id as string,
  },
});

// Register shared JSON schemas (used for validation, serialization, and OpenAPI)
registerSharedSchemas(server);

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
