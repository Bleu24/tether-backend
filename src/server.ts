import { createApp } from "./app";
import { env } from "./config/env";
import { WebSocketHub } from "./realtime/WebSocketHub";
import { bootstrapDatabase } from "./services/BootstrapService";

(async () => {
    // Create database and tables if missing
    await bootstrapDatabase();

    const { app, logger } = createApp();
    const server = app.listen(env.PORT, () => {
        logger.info(`🚀 Tether API ready on http://localhost:${env.PORT}`);
    });
    // Initialize WebSocket server for matched users only
    WebSocketHub.init(server);
})().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err);
    process.exit(1);
});
