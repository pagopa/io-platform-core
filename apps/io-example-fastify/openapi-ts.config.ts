import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input: "./openapi/openapi.yaml", // sign up at app.heyapi.dev
  output: "src/adapters/inbound/generated/api-types",
  plugins: ["@hey-api/typescript"],
});
