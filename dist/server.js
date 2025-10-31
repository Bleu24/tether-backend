"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const WebSocketHub_1 = require("./realtime/WebSocketHub");
const BootstrapService_1 = require("./services/BootstrapService");
(async () => {
    // Create database and tables if missing
    await (0, BootstrapService_1.bootstrapDatabase)();
    const { app, logger } = (0, app_1.createApp)();
    const server = app.listen(env_1.env.PORT, () => {
        logger.info(`🚀 Tether API ready on http://localhost:${env_1.env.PORT}`);
    });
    // Initialize WebSocket server for matched users only
    WebSocketHub_1.WebSocketHub.init(server);
})().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", err);
    process.exit(1);
});
