"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pino_1 = __importDefault(require("pino"));
const path_1 = __importDefault(require("path"));
const env_1 = require("./config/env");
const routes_1 = require("./routes");
const errorHandler_1 = require("./middleware/errorHandler");
const jwt_1 = require("./middleware/jwt");
function createApp() {
    const app = (0, express_1.default)();
    const logger = (0, pino_1.default)({ name: "tether-backend", level: env_1.env.NODE_ENV === "development" ? "debug" : "info" });
    // Trust reverse proxies (needed for secure cookies and protocol detection)
    app.set("trust proxy", 1);
    app.use((0, cors_1.default)({
        origin: env_1.env.CORS_ORIGIN === "*" ? true : env_1.env.CORS_ORIGIN.split(","),
        credentials: true,
        allowedHeaders: ["Content-Type", "X-User-Id", "Authorization"],
    }));
    app.use(express_1.default.json());
    // JWT auth: attaches res.locals.userId if cookie is valid
    app.use(jwt_1.jwtAuthenticate);
    // Serve uploaded files statically
    const uploadsDir = path_1.default.resolve(process.cwd(), "uploads");
    app.use("/uploads", express_1.default.static(uploadsDir));
    app.get("/", (_req, res) => {
        res.json({ name: "Tether API", version: "0.1.0" });
    });
    app.use("/api", (0, routes_1.apiRouter)());
    app.use(errorHandler_1.errorHandler);
    return { app, logger };
}
