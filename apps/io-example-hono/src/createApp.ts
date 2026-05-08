import { OpenAPIHono } from "@hono/zod-openapi";

import {
  mountCreateUserProfileHandler,
  mountDeleteUserProfileHandler,
  mountGetUserProfileHandler,
  mountInfoHandler,
  mountUpdateUserProfileHandler,
} from "./adapters/inbound/hono/index.js";
import { InMemoryUserProfileRepository } from "./adapters/outbound/persistence/in-memory-user-profile.repository.js";
import { makeCreateUserProfileUseCase } from "./application/use-cases/create-user-profile.use-case.js";
import { makeDeleteUserProfileUseCase } from "./application/use-cases/delete-user-profile.use-case.js";
import { makeGetUserProfileUseCase } from "./application/use-cases/get-user-profile.use-case.js";
import { getInfoUseCase } from "./application/use-cases/info.use-case.js";
import { makeUpdateUserProfileUseCase } from "./application/use-cases/update-user-profile.use-case.js";

export const createApp = (): OpenAPIHono => {
  const app = new OpenAPIHono({
    defaultHook: (result, c) => {
      if (!result.success) {
        const problemDetails = {
          detail: result.error.message,
          status: 400,
          title: "Validation Error",
          type: "https://ioapp.it/problems/validation-error",
        };
        return c.json(problemDetails, 400, {
          "Content-Type": "application/problem+json; charset=utf-8",
        });
      }
    },
  });

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

  mountInfoHandler(app, getInfoUseCase);
  mountGetUserProfileHandler(app, getUserProfileUseCase);
  mountCreateUserProfileHandler(app, createUserProfileUseCase);
  mountUpdateUserProfileHandler(app, updateUserProfileUseCase);
  mountDeleteUserProfileHandler(app, deleteUserProfileUseCase);

  return app;
};
