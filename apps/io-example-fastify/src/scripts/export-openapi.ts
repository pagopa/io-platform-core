import fastifySwagger from "@fastify/swagger";
import fastify from "fastify";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stringify } from "yaml";

import {
  mountCreateUserProfileHandler,
  mountDeleteUserProfileHandler,
  mountGetUserProfileHandler,
  mountInfoHandler,
  mountUpdateUserProfileHandler,
} from "../adapters/inbound/fastify/index.js";
import { registerSharedSchemas } from "../adapters/inbound/fastify/schemas/shared.schemas.js";
import { InMemoryUserProfileRepository } from "../adapters/outbound/persistence/in-memory-user-profile.repository.js";
import { makeCreateUserProfileUseCase } from "../application/use-cases/create-user-profile.use-case.js";
import { makeDeleteUserProfileUseCase } from "../application/use-cases/delete-user-profile.use-case.js";
import { makeGetUserProfileUseCase } from "../application/use-cases/get-user-profile.use-case.js";
import { getInfoUseCase } from "../application/use-cases/info.use-case.js";
import { makeUpdateUserProfileUseCase } from "../application/use-cases/update-user-profile.use-case.js";

const buildServer = async () => {
  const server = fastify();

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

  registerSharedSchemas(server);

  const userProfileRepository = new InMemoryUserProfileRepository();

  mountInfoHandler(server, getInfoUseCase);
  mountGetUserProfileHandler(
    server,
    makeGetUserProfileUseCase(userProfileRepository),
  );
  mountCreateUserProfileHandler(
    server,
    makeCreateUserProfileUseCase(userProfileRepository),
  );
  mountUpdateUserProfileHandler(
    server,
    makeUpdateUserProfileUseCase(userProfileRepository),
  );
  mountDeleteUserProfileHandler(
    server,
    makeDeleteUserProfileUseCase(userProfileRepository),
  );

  await server.ready();
  return server;
};

const main = async () => {
  const server = await buildServer();
  const spec = server.swagger();

  const outputPath = resolve(
    import.meta.dirname,
    "../../openapi/openapi-generated.yaml",
  );
  writeFileSync(outputPath, stringify(spec, { lineWidth: 120 }), "utf-8");

  console.log(`OpenAPI spec written to ${outputPath}`);
  await server.close();
};

main().catch((err) => {
  console.error("Failed to export OpenAPI spec:", err);
  process.exit(1);
});
