import { createApp } from "./createApp.js";

/** Starts the Fastify HTTP server for the example application. */
const main = async (): Promise<void> => {
  const { server } = createApp();

  try {
    await server.listen({ port: 7072 });
    console.log("Server listening on http://localhost:7072");
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

await main();
