import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DB_HOST: z.string(),
    DB_PORT: z.coerce.number().default(3306),
    DB_USER: z.string(),
    DB_PASSWORD: z.string().optional().default(""),
    DB_NAME: z.string(),
    DB_CONN_LIMIT: z.coerce.number().default(10),
    CORS_ORIGIN: z.string().optional().default("*")
});

export const env = envSchema.parse(process.env);
