// Starts the full app for end-to-end tests: an in-memory MongoDB plus the real backend,
// which also serves the built frontend (frontend/dist) on the same port.
// Used by playwright.config.js as its webServer; requires `npm run build --prefix frontend`.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { MongoMemoryServer } from "mongodb-memory-server";

const distIndex = fileURLToPath(new URL("../frontend/dist/index.html", import.meta.url));
if (!existsSync(distIndex)) {
  console.error("[e2e] frontend/dist not found. Run `npm run build --prefix frontend` first.");
  process.exit(1);
}

const mongo = await MongoMemoryServer.create();
const port = process.env.E2E_PORT || "3100";

Object.assign(process.env, {
  MONGO_URI: mongo.getUri("nightwire-e2e"),
  JWT_SECRET: "e2e-secret",
  PORT: port,
  NODE_ENV: "test",
  CLIENT_URL: `http://localhost:${port}`,
  // Optional services stay off so tests never send email or call Arcjet.
  RESEND_API_KEY: "",
  ARCJET_KEY: "",
});

const stop = async () => {
  await mongo.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await import("../backend/server.js");
