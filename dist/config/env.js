"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
// Load .env from backend folder first, then try repo root fallbacks (.env, .env.development/.production)
(() => {
    const here = path_1.default.resolve(__dirname, "../../.env"); // backend/.env
    const hereDev = path_1.default.resolve(__dirname, "../../.env.development"); // backend/.env.development
    const hereDevWSL = path_1.default.resolve(__dirname, "../../.env.development.wsl");
    const hereDevWin = path_1.default.resolve(__dirname, "../../.env.development.windows");
    const repoRoot = path_1.default.resolve(__dirname, "../../../");
    const isWin = process.platform === "win32";
    const isWSL = process.platform === "linux" && Boolean(process.env.WSL_DISTRO_NAME);
    const candidates = [
        // Prefer platform-specific dev env first
        ...(isWin ? [hereDevWin] : []),
        ...(isWSL ? [hereDevWSL] : []),
        here,
        hereDev,
        // repo-root fallbacks
        ...(isWin ? [path_1.default.join(repoRoot, ".env.development.windows")] : []),
        ...(isWSL ? [path_1.default.join(repoRoot, ".env.development.wsl")] : []),
        path_1.default.join(repoRoot, ".env"),
        path_1.default.join(repoRoot, ".env.development"),
        path_1.default.join(repoRoot, ".env.production"),
    ];
    for (const file of candidates) {
        if (fs_1.default.existsSync(file)) {
            dotenv_1.default.config({ path: file });
            break;
        }
    }
})();
const envSchemaCore = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().default(4000),
    // Database connection (MySQL/TiDB)
    DB_URL: zod_1.z.string().optional(), // Optional MySQL URL (e.g. mysql://user:pass@host:4000/db)
    DB_HOST: zod_1.z.string().default("localhost"),
    DB_PORT: zod_1.z.coerce.number().default(3306),
    DB_USER: zod_1.z.string().optional(),
    DB_PASSWORD: zod_1.z.string().optional().default(""),
    DB_NAME: zod_1.z.string().optional(),
    DB_CONN_LIMIT: zod_1.z.coerce.number().default(10),
    DB_SOCKET: zod_1.z.string().optional(),
    // TLS/SSL options for TiDB Cloud & MySQL over the Internet
    DB_SSL: zod_1.z.coerce.boolean().optional().default(false),
    DB_SSL_CA: zod_1.z.string().optional(), // Path to CA PEM file if provided by provider
    CORS_ORIGIN: zod_1.z.string().optional().default("*"),
    JWT_SECRET: zod_1.z.string().default("25ad4e9647b1d9bd62cfa40175eb0296c2e3d75c332b837446e85931a5e96579"),
    COOKIE_DOMAIN: zod_1.z.string().optional(),
    // Cookie SameSite behavior. Use "None" for cross-site (frontend and backend on different domains)
    COOKIE_SAMESITE: zod_1.z.enum(["Lax", "None", "Strict"]).optional().default("Lax"),
    // S3/R2 storage (optional)
    S3_BUCKET: zod_1.z.string().optional(),
    S3_REGION: zod_1.z.string().optional().default("auto"),
    S3_ENDPOINT: zod_1.z.string().optional(), // for R2 or custom endpoints (e.g., https://<account>.r2.cloudflarestorage.com)
    S3_ACCESS_KEY_ID: zod_1.z.string().optional(),
    S3_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    S3_FORCE_PATH_STYLE: zod_1.z.coerce.boolean().optional().default(false),
    // If true or if S3_PUBLIC_BASE_URL is not set, backend will proxy file reads at /api/files/:key
    S3_PROXY: zod_1.z.coerce.boolean().optional().default(true),
    S3_PUBLIC_BASE_URL: zod_1.z.string().optional(), // e.g. https://cdn.example.com or https://<bucket>.<region>.amazonaws.com
});
// Allow either full DB_URL or discrete fields (DB_USER + DB_NAME at minimum)
const envSchema = envSchemaCore.superRefine((val, ctx) => {
    const hasURL = Boolean(val.DB_URL);
    const hasDiscrete = Boolean(val.DB_USER && val.DB_NAME);
    if (!hasURL && !hasDiscrete) {
        ctx.addIssue({
            code: zod_1.z.ZodIssueCode.custom,
            message: "Provide either DB_URL or both DB_USER and DB_NAME",
            path: ["DB_URL"],
        });
    }
});
exports.env = envSchema.parse(process.env);
