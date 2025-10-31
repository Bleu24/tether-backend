import { createPool, Pool } from "mysql2/promise";
import fs from "fs";
import { env } from "../config/env";
import { IDatabase, QueryResult } from "../interfaces/IDatabase";

export class MySQLDatabase implements IDatabase {
    #pool: Pool;

    constructor() {
        const baseConfig: any = {
            connectionLimit: env.DB_CONN_LIMIT,
            waitForConnections: true,
            timezone: "+00:00",
        };

        // Prefer DB_URL if provided
        if (env.DB_URL) {
            const u = new URL(env.DB_URL);
            baseConfig.user = decodeURIComponent(u.username);
            baseConfig.password = decodeURIComponent(u.password);
            baseConfig.database = decodeURIComponent(u.pathname.replace(/^\//, ""));
            baseConfig.host = u.hostname;
            baseConfig.port = Number(u.port) || 3306;
        } else {
            baseConfig.user = env.DB_USER;
            baseConfig.password = env.DB_PASSWORD;
            baseConfig.database = env.DB_NAME;
        }
        if (env.DB_SOCKET) {
            baseConfig.socketPath = env.DB_SOCKET;
        } else {
            baseConfig.host = baseConfig.host ?? env.DB_HOST;
            baseConfig.port = baseConfig.port ?? env.DB_PORT;
        }

        // Enable TLS for TiDB Cloud / Internet DBs when requested
        if (env.DB_SSL || env.DB_SSL_CA) {
            let ssl: any = { minVersion: "TLSv1.2" };
            if (env.DB_SSL_CA) {
                try {
                    ssl.ca = fs.readFileSync(env.DB_SSL_CA, "utf8");
                } catch (e) {
                    // Fallback to default CA store if custom CA can't be read
                    ssl = { ...ssl, rejectUnauthorized: true };
                }
            } else {
                ssl = { ...ssl, rejectUnauthorized: true };
            }
            baseConfig.ssl = ssl;
        }
        this.#pool = createPool(baseConfig);
    }

    async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
        const [rows] = await this.#pool.query(sql, params);
        return { rows: rows as T[] };
    }

    async execute(sql: string, params: any[] = []): Promise<void> {
        await this.#pool.execute(sql, params);
    }

    async end(): Promise<void> {
        await this.#pool.end();
    }
}

// A thin container to follow Dependency Inversion Principle.
export class DatabaseService {
    static #instance: IDatabase | null = null;

    static get(): IDatabase {
        if (!this.#instance) {
            this.#instance = new MySQLDatabase();
        }
        return this.#instance;
    }
}
