import type { RouteRegistry } from "@pagopa/io-core-openapi";

import {
  mountFunctionsRoute,
  ProblemJson,
} from "@pagopa/io-core-adapter-azure-functions-v4";
import { defineRoute } from "@pagopa/io-core-openapi";

import type { GetUserProfileUseCase } from "../../../application/use-cases/get-user-profile.use-case.js";

import {
  FiscalCodeHeaderSchema,
  UserProfileResponseSchema,
} from "./dto/openapi-schemas.js";

const getUserProfileContract = defineRoute({
  description:
    "Returns the user profile associated with the given fiscal code.",
  method: "get",
  operationId: "getUserProfile",
  path: "/api/user-profiles",
  request: {
    headers: FiscalCodeHeaderSchema,
  },
  response: {
    200: {
      description: "User profile returned successfully.",
      schema: UserProfileResponseSchema,
    },
    400: ProblemJson,
    404: ProblemJson,
    500: ProblemJson,
  },
  security: [{ functionKey: [] }],
  summary: "Get a user profile by fiscal code",
  tags: ["UserProfiles"],
});

export const mountGetUserProfileHandler = (
  useCase: GetUserProfileUseCase,
  registry?: RouteRegistry,
): void => {
  mountFunctionsRoute({
    contract: getUserProfileContract,
    registry,
    transformInput: ({ headers }) => ({
      fiscalCode: headers["x-fiscal-code"],
    }),
    useCase,
  });
};
