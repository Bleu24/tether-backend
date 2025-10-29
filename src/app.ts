import express from "express";
import cors from "cors";
import pino from "pino";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { devAuthenticate } from "./middleware/auth";

export function createApp() {
    const app = express();
    const logger = pino({ name: "tether-backend", level: env.NODE_ENV === "development" ? "debug" : "info" });

    app.use(cors({
        origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
        credentials: true,
        allowedHeaders: ["Content-Type", "X-User-Id"],
    }));
    app.use(express.json());

    // dev auth: attaches res.locals.userId if provided via header or query
    app.use(devAuthenticate);

    app.get("/", (_req, res) => {
        res.json({ name: "Tether API", version: "0.1.0" });
    });

    app.use("/api", apiRouter());

    app.use(errorHandler);

    return { app, logger };
}
