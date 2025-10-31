import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

// Load .env from backend folder first, then try repo root fallbacks (.env, .env.development/.production)
(() => {
    const here = path.resolve(__dirname, "../../.env"); // backend/.env
    const hereDev = path.resolve(__dirname, "../../.env.development"); // backend/.env.development
    const hereProd = path.resolve(__dirname, "../../.env.production"); // backend/.env.production
    const hereDevWSL = path.resolve(__dirname, "../../.env.development.wsl");
    const hereDevWin = path.resolve(__dirname, "../../.env.development.windows");
    const repoRoot = path.resolve(__dirname, "../../../");
    const isWin = process.platform === "win32";
    const isWSL = process.platform === "linux" && Boolean(process.env.WSL_DISTRO_NAME);
    const candidates = [
        // Prefer platform-specific dev env first
        ...(isWin ? [hereDevWin] : []),
        ...(isWSL ? [hereDevWSL] : []),
    here,
    hereDev,
    hereProd,
        // repo-root fallbacks
        ...(isWin ? [path.join(repoRoot, ".env.development.windows")] : []),
        ...(isWSL ? [path.join(repoRoot, ".env.development.wsl")] : []),
        path.join(repoRoot, ".env"),
        path.join(repoRoot, ".env.development"),
        path.join(repoRoot, ".env.production"),
    ];
    for (const file of candidates) {
        if (fs.existsSync(file)) {
            dotenv.config({ path: file });
            break;
        }
    }
})();

const envSchemaCore = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    // Database connection (MySQL/TiDB)
    DB_URL: z.string().optional(), // Optional MySQL URL (e.g. mysql://user:pass@host:4000/db)
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.coerce.number().default(3306),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional().default(""),
    DB_NAME: z.string().optional(),
    DB_CONN_LIMIT: z.coerce.number().default(10),
    DB_SOCKET: z.string().optional(),
    // TLS/SSL options for TiDB Cloud & MySQL over the Internet
    DB_SSL: z.coerce.boolean().optional().default(false),
    DB_SSL_CA: z.string().optional(), // Path to CA PEM file if provided by provider
    CORS_ORIGIN: z.string().optional().default("*"),
    JWT_SECRET: z.string().default("25ad4e9647b1d9bd62cfa40175eb0296c2e3d75c332b837446e85931a5e96579"),
    COOKIE_DOMAIN: z.string().optional(),
    // S3/R2 storage (optional)
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ENDPOINT: z.string().optional(), // for R2 or custom endpoints
    S3_PUBLIC_BASE_URL: z.string().optional(), // e.g. https://cdn.example.com or https://<bucket>.<region>.amazonaws.com
});

// Allow either full DB_URL or discrete fields (DB_USER + DB_NAME at minimum)
const envSchema = envSchemaCore.superRefine((val, ctx) => {
    const hasURL = Boolean(val.DB_URL);
    const hasDiscrete = Boolean(val.DB_USER && val.DB_NAME);
    if (!hasURL && !hasDiscrete) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Provide either DB_URL or both DB_USER and DB_NAME",
            path: ["DB_URL"],
        });
    }
});

export const env = envSchema.parse(process.env);
