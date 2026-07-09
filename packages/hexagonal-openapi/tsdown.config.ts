import { defineConfig } from "tsdown";

/**
 * tsdown build configuration for `@pagopa/hexagonal-openapi`.
 *
 * Emits a dual ESM + CommonJS build so the toolkit can be consumed from either
 * module system. The single public entry point maps to flat output files:
 *   - ESM:  `index.js`  + types `index.d.ts`
 *   - CJS:  `index.cjs` + types `index.d.cts`
 *
 * The `exports` map in `package.json` mirrors these filenames.
 */
export default defineConfig({
  clean: true,
  dts: true,
  entry: {
    index: "src/index.ts",
  },
  format: ["esm", "cjs"],
  outDir: "dist",
  outExtensions: ({ format }) =>
    format === "cjs"
      ? { dts: ".d.cts", js: ".cjs" }
      : { dts: ".d.ts", js: ".js" },
  sourcemap: true,
  treeshake: true,
});
