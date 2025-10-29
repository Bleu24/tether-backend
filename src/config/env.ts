import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

// Load .env from backend folder first, then try repo root fallbacks (.env, .env.development/.production)
(() => {
    const here = path.resolve(__dirname, "../../.env"); // backend/.env
    const hereDev = path.resolve(__dirname, "../../.env.development"); // backend/.env.development
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

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DB_HOST: z.string().default("localhost"),
    DB_PORT: z.coerce.number().default(3306),
    DB_USER: z.string(),
    DB_PASSWORD: z.string().optional().default(""),
    DB_NAME: z.string(),
    DB_CONN_LIMIT: z.coerce.number().default(10),
    DB_SOCKET: z.string().optional(),
    CORS_ORIGIN: z.string().optional().default("*")
});

export const env = envSchema.parse(process.env);
