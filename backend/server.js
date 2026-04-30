import "dotenv/config";
import http from "http";

import { buildApp } from "./src/core/app.js";
import { connectDatabase } from "./src/core/db.js";
import { initSocket } from "./src/core/socket.js";

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  await connectDatabase();

  const app = buildApp();
  const httpServer = http.createServer(app);

  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`[Server] NightWire running on http://localhost:${PORT}`);
  });
}

bootstrap();
