import type { RouteRegistry } from "@pagopa/io-core-openapi";

import {
  mountFunctionsRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-azure-functions-v4";
import { defineRoute } from "@pagopa/io-core-openapi";

import type { UpdateUserProfileUseCase } from "../../../application/use-cases/update-user-profile.use-case.js";

import {
  FiscalCodeHeaderSchema,
  UpdateUserProfileBodySchema,
  UserProfileResponseSchema,
} from "./dto/openapi-schemas.js";

const updateUserProfileContract = defineRoute({
  description: "Updates the user profile identified by the fiscal code header.",
  method: "put",
  operationId: "updateUserProfile",
  path: "/api/user-profiles",
  request: {
    body: UpdateUserProfileBodySchema,
    headers: FiscalCodeHeaderSchema,
  },
  response: {
    200: {
      description: "User profile updated successfully.",
      schema: UserProfileResponseSchema,
    },
    400: ProblemJson,
    404: ProblemJson,
    500: ProblemJson,
  },
  security: [{ functionKey: [] }],
  summary: "Update an existing user profile",
  tags: ["UserProfiles"],
});

export const mountUpdateUserProfileHandler = (
  useCase: UpdateUserProfileUseCase,
  registry?: RouteRegistry,
): void => {
  mountFunctionsRoute({
    contract: updateUserProfileContract,
    registry,
    transformInput: ({ body, headers }) => ({
      email: body.email,
      fiscalCode: headers["x-fiscal-code"],
      name: body.name,
    }),
    useCase,
  });
};
