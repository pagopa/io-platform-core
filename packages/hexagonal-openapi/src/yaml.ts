import { readFile, writeFile } from "node:fs/promises";
import { stringify } from "yaml";

/** Serializes an OpenAPI document to a stable YAML string. */
export const openApiToYaml = (doc: unknown): string =>
  stringify(doc, { indent: 2, lineWidth: 0, sortMapEntries: false });

/** Options accepted by {@link writeOpenApiYaml}. */
export interface WriteOptions {
  /**
   * If true, do not write. Compare the existing file with the freshly
   * serialized YAML and return `check-failed` on drift. Used in CI.
   */
  check?: boolean;
  /** The OpenAPI document to serialize. */
  doc: unknown;
  /** Destination file path. */
  path: string;
}

/** Outcome of {@link writeOpenApiYaml}. */
export type WriteResult =
  | { diff: string; kind: "check-failed"; path: string }
  | { kind: "ok"; path: string }
  | { kind: "unchanged"; path: string };

/**
 * Serializes an OpenAPI document to YAML and writes it to disk, or (in `check`
 * mode) verifies the on-disk file is up to date.
 *
 * @param options The document, destination path and optional `check` flag.
 * @returns `unchanged` when already up to date, `ok` after a successful write,
 *   or `check-failed` (with a diff) when `check` is set and the file drifted.
 */
export const writeOpenApiYaml = async (
  options: WriteOptions,
): Promise<WriteResult> => {
  const next = openApiToYaml(options.doc);

  let current: string | undefined;
  try {
    current = await readFile(options.path, "utf8");
  } catch {
    current = undefined;
  }

  if (current === next) return { kind: "unchanged", path: options.path };

  if (options.check) {
    return {
      diff: minimalDiff(current ?? "", next),
      kind: "check-failed",
      path: options.path,
    };
  }

  await writeFile(options.path, next, "utf8");
  return { kind: "ok", path: options.path };
};

const minimalDiff = (a: string, b: string): string => {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const out: string[] = [];
  const max = Math.max(aLines.length, bLines.length);
  for (let i = 0; i < max; i++) {
    if (aLines[i] !== bLines[i]) {
      if (aLines[i] !== undefined) out.push("- " + aLines[i]);
      if (bLines[i] !== undefined) out.push("+ " + bLines[i]);
    }
  }
  return out.slice(0, 200).join("\n");
};
