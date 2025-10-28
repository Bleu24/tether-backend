import { createPool, Pool } from "mysql2/promise";
import { env } from "../config/env";
import { IDatabase, QueryResult } from "../interfaces/IDatabase";

export class MySQLDatabase implements IDatabase {
    #pool: Pool;

    constructor() {
        this.#pool = createPool({
            host: env.DB_HOST,
            port: env.DB_PORT,
            user: env.DB_USER,
            password: env.DB_PASSWORD,
            database: env.DB_NAME,
            connectionLimit: env.DB_CONN_LIMIT,
            waitForConnections: true,
            timezone: "+00:00",
        });
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
