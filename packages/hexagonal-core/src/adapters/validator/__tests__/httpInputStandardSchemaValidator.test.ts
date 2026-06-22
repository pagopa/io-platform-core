import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  createHttpRequestValidator,
  emptyValidator,
  type HttpRequestPayload,
  validationErrorFromStandardIssues,
} from "../httpInputStandardSchemaValidator.js";

interface FakeRequest {
  params: { id?: string };
}

const schema = z.object({ path: z.object({ id: z.string() }) });
const extractPayload = (request: FakeRequest): HttpRequestPayload => ({
  path: request.params,
});

describe("createHttpRequestValidator", () => {
  it("returns ok with the validated input", async () => {
    const validate = createHttpRequestValidator<FakeRequest, typeof schema>(
      schema,
      extractPayload
    );

    const result = await validate({ params: { id: "abc" } });

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({ path: { id: "abc" } });
  });

  it("returns a ValidationError describing the offending path", async () => {
    const validate = createHttpRequestValidator<FakeRequest, typeof schema>(
      schema,
      extractPayload
    );

    const result = await validate({ params: {} });

    expect(result.isErr()).toBe(true);
    const error = result._unsafeUnwrapErr();
    expect(error.kind).toBe("ValidationError");
    expect(error.message).toContain("path.id");
  });
});

describe("validationErrorFromStandardIssues", () => {
  it("annotates each issue with its dotted path", () => {
    const error = validationErrorFromStandardIssues([
      { message: "Required", path: ["body", "id"] },
    ]);

    expect(error.kind).toBe("ValidationError");
    expect(error.message).toContain("[body.id]: Required");
  });

  it("uses 'root' when an issue has no path", () => {
    const error = validationErrorFromStandardIssues([{ message: "Bad" }]);

    expect(error.message).toContain("[root]: Bad");
  });
});

describe("emptyValidator", () => {
  it("yields an empty object regardless of the request", async () => {
    const result = await emptyValidator(undefined);

    expect(result.isOk()).toBe(true);
    expect(result._unsafeUnwrap()).toEqual({});
  });
});
