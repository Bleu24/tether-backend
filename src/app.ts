import express from "express";
import cors from "cors";
import pino from "pino";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
    const app = express();
    const logger = pino({ name: "tether-backend", level: env.NODE_ENV === "development" ? "debug" : "info" });

    app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","), credentials: true }));
    app.use(express.json());

    app.get("/", (_req, res) => {
        res.json({ name: "Tether API", version: "0.1.0" });
    });

    app.use("/api", apiRouter());

    app.use(errorHandler);

    return { app, logger };
}
