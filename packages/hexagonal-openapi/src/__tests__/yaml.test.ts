import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { openApiToYaml, writeOpenApiYaml } from "../yaml.js";

const doc = { info: { title: "T", version: "1.0.0" }, openapi: "3.1.0" };

describe("openApiToYaml", () => {
  it("serializes a document to YAML", () => {
    const yaml = openApiToYaml(doc);

    expect(yaml).toContain("openapi: 3.1.0");
  });
});

describe("writeOpenApiYaml", () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "hexagonal-openapi-"));
  });

  afterAll(async () => {
    await rm(dir, { force: true, recursive: true });
  });

  it("writes the file when it does not yet exist", async () => {
    const path = join(dir, "openapi.yaml");

    const result = await writeOpenApiYaml({ doc, path });

    expect(result.kind).toBe("ok");
    await expect(readFile(path, "utf8")).resolves.toBe(openApiToYaml(doc));
  });

  it("reports unchanged when the file is already up to date", async () => {
    const path = join(dir, "unchanged.yaml");
    await writeOpenApiYaml({ doc, path });

    const result = await writeOpenApiYaml({ doc, path });

    expect(result.kind).toBe("unchanged");
  });

  it("reports check-failed on drift in check mode", async () => {
    const path = join(dir, "check.yaml");
    await writeOpenApiYaml({ doc, path });

    const result = await writeOpenApiYaml({
      check: true,
      doc: { ...doc, info: { title: "Changed", version: "2.0.0" } },
      path,
    });

    expect(result.kind).toBe("check-failed");
  });

  it("treats CRLF and LF line endings as equivalent in check mode", async () => {
    const path = join(dir, "crlf.yaml");
    await writeFile(path, openApiToYaml(doc).replace(/\n/g, "\r\n"), "utf8");

    const result = await writeOpenApiYaml({ check: true, doc, path });

    expect(result.kind).toBe("unchanged");
  });

  it("throws when reading an existing path fails for a non-ENOENT reason", async () => {
    const path = dir; // directory path forces EISDIR on readFile

    await expect(writeOpenApiYaml({ doc, path })).rejects.toThrow();
  });
});
