import express from "express";
import cors from "cors";
import pino from "pino";
import path from "path";
import { env } from "./config/env";
import { apiRouter } from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { jwtAuthenticate } from "./middleware/jwt";

export function createApp() {
    const app = express();
    const logger = pino({ name: "tether-backend", level: env.NODE_ENV === "development" ? "debug" : "info" });
    // Trust reverse proxies (needed for secure cookies and protocol detection)
    app.set("trust proxy", 1);

    app.use(cors({
        origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(","),
        credentials: true,
        allowedHeaders: ["Content-Type", "X-User-Id", "Authorization"],
    }));
    app.use(express.json());
    // JWT auth: attaches res.locals.userId if cookie is valid
    app.use(jwtAuthenticate);

    // Serve uploaded files statically
    const uploadsDir = path.resolve(process.cwd(), "uploads");
    app.use("/uploads", express.static(uploadsDir));

    app.get("/", (_req, res) => {
        res.json({ name: "Tether API", version: "0.1.0" });
    });

    app.use("/api", apiRouter());

    app.use(errorHandler);

    return { app, logger };
}
