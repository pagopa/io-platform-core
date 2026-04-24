import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("Prova", () => {
  it("should pass", () => {
    const dateAsString = "2024-06-01T12:00:00Z";
    const res = z.coerce.date().parse(dateAsString);

    expect(res).toEqual(new Date(dateAsString));
  });
});
