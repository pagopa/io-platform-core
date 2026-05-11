import { createApp } from "./createApp.js";

const { server } = createApp();

const start = async () => {
  try {
    await server.listen({ port: 7072 });
    console.log("Server listening on http://localhost:7072");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
