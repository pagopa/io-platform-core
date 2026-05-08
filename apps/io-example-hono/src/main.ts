import { serve } from "@hono/node-server";

import { createApp } from "./createApp.js";

const app = createApp();

serve({ fetch: app.fetch, port: 7071 }, (info) => {
  console.log(`Server listening on http://localhost:${info.port}`);
});
