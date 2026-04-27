import type { RouteRegistry } from "@pagopa/io-core-openapi";

import {
  mountFunctionsRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-azure-functions-v4";
import { defineRoute } from "@pagopa/io-core-openapi";

import type { DeleteUserProfileUseCase } from "../../../application/use-cases/delete-user-profile.use-case.js";

import {
  FiscalCodeHeaderSchema,
  UserProfileResponseSchema,
} from "./dto/openapi-schemas.js";

const deleteUserProfileContract = defineRoute({
  description:
    "Deletes the user profile associated with the given fiscal code and returns the deleted profile.",
  method: "delete",
  operationId: "deleteUserProfile",
  path: "/api/user-profiles",
  request: {
    headers: FiscalCodeHeaderSchema,
  },
  response: {
    200: {
      description: "User profile deleted successfully.",
      schema: UserProfileResponseSchema,
    },
    400: ProblemJson,
    404: ProblemJson,
    500: ProblemJson,
  },
  security: [{ functionKey: [] }],
  summary: "Delete a user profile by fiscal code",
  tags: ["UserProfiles"],
});

export const mountDeleteUserProfileHandler = (
  useCase: DeleteUserProfileUseCase,
  registry?: RouteRegistry,
): void => {
  mountFunctionsRoute({
    contract: deleteUserProfileContract,
    registry,
    transformInput: ({ headers }) => ({
      fiscalCode: headers["x-fiscal-code"],
    }),
    useCase,
  });
};
