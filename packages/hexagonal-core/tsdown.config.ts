import { defineConfig } from "tsdown";

/**
 * tsdown build configuration for `@pagopa/hexagonal-core`.
 *
 * Emits a dual ESM + CommonJS build so the library can be consumed from either
 * module system. Each public entry point maps to a flat output file in `dist/`:
 *   - ESM:  `<name>.js`   + types `<name>.d.ts`
 *   - CJS:  `<name>.cjs`  + types `<name>.d.cts`
 *
 * The `exports` map in `package.json` must mirror these filenames.
 */
export default defineConfig({
  // Remove the previous `dist/` output before each build.
  clean: true,
  // Generate `.d.ts` (ESM) and `.d.cts` (CJS) type declarations.
  dts: true,
  // Named entries keep the emitted filenames stable and predictable, which lets
  // the `package.json` `exports` map point at deterministic paths.
  entry: {
    adapters: "src/adapters/index.ts",
    "adapters/logger": "src/adapters/logger/index.ts",
    "domain/errors": "src/domain/errors/index.ts",
    "domain/ports": "src/domain/ports/index.ts",
    "domain/value-objects": "src/domain/value-objects/index.ts",
    index: "src/index.ts",
  },
  // Build both module formats: ESM (`.js`) and CommonJS (`.cjs`).
  format: ["esm", "cjs"],
  outDir: "dist",
  // Pin deterministic, clean output extensions so the `package.json` `exports`
  // map can point at stable paths:
  //   - ESM: `<name>.js`  + types `<name>.d.ts`
  //   - CJS: `<name>.cjs` + types `<name>.d.cts`
  outExtensions: ({ format }) =>
    format === "cjs"
      ? { dts: ".d.cts", js: ".cjs" }
      : { dts: ".d.ts", js: ".js" },
  sourcemap: true,
  // Drop dead code from the published bundles.
  treeshake: true,
});
