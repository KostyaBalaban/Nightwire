import "dotenv/config";
import http from "http";

import { buildApp } from "./src/core/app.js";
import { connectDatabase } from "./src/core/db.js";
import { initSocket } from "./src/core/socket.js";

const PORT = process.env.PORT || 3000;

const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];

async function bootstrap() {
  const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
  if (missing.length) {
    console.error(`[Config] Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }

  await connectDatabase();

  const app = buildApp();
  const httpServer = http.createServer(app);

  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`[Server] NightWire running on http://localhost:${PORT}`);
  });
}

bootstrap();
