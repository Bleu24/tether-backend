import { createApp } from "./app";
import { env } from "./config/env";
import { WebSocketHub } from "./realtime/WebSocketHub";

const { app, logger } = createApp();

const server = app.listen(env.PORT, () => {
    logger.info(`🚀 Tether API ready on http://localhost:${env.PORT}`);
});

// Initialize WebSocket server for matched users only
WebSocketHub.init(server);
