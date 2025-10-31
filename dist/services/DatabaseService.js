"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _MySQLDatabase_pool, _a, _DatabaseService_instance;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = exports.MySQLDatabase = void 0;
const promise_1 = require("mysql2/promise");
const fs_1 = __importDefault(require("fs"));
const env_1 = require("../config/env");
class MySQLDatabase {
    constructor() {
        _MySQLDatabase_pool.set(this, void 0);
        const baseConfig = {
            user: env_1.env.DB_USER,
            password: env_1.env.DB_PASSWORD,
            database: env_1.env.DB_NAME,
            connectionLimit: env_1.env.DB_CONN_LIMIT,
            waitForConnections: true,
            timezone: "+00:00",
        };
        if (env_1.env.DB_SOCKET) {
            baseConfig.socketPath = env_1.env.DB_SOCKET;
        }
        else {
            baseConfig.host = env_1.env.DB_HOST;
            baseConfig.port = env_1.env.DB_PORT;
        }
        // Enable TLS for TiDB Cloud / Internet DBs when requested
        if (env_1.env.DB_SSL || env_1.env.DB_SSL_CA) {
            let ssl = { minVersion: "TLSv1.2" };
            if (env_1.env.DB_SSL_CA) {
                try {
                    ssl.ca = fs_1.default.readFileSync(env_1.env.DB_SSL_CA, "utf8");
                }
                catch (e) {
                    // Fallback to default CA store if custom CA can't be read
                    ssl = { ...ssl, rejectUnauthorized: true };
                }
            }
            else {
                ssl = { ...ssl, rejectUnauthorized: true };
            }
            baseConfig.ssl = ssl;
        }
        __classPrivateFieldSet(this, _MySQLDatabase_pool, (0, promise_1.createPool)(baseConfig), "f");
    }
    async query(sql, params = []) {
        const [rows] = await __classPrivateFieldGet(this, _MySQLDatabase_pool, "f").query(sql, params);
        return { rows: rows };
    }
    async execute(sql, params = []) {
        await __classPrivateFieldGet(this, _MySQLDatabase_pool, "f").execute(sql, params);
    }
    async end() {
        await __classPrivateFieldGet(this, _MySQLDatabase_pool, "f").end();
    }
}
exports.MySQLDatabase = MySQLDatabase;
_MySQLDatabase_pool = new WeakMap();
// A thin container to follow Dependency Inversion Principle.
class DatabaseService {
    static get() {
        if (!__classPrivateFieldGet(this, _a, "f", _DatabaseService_instance)) {
            __classPrivateFieldSet(this, _a, new MySQLDatabase(), "f", _DatabaseService_instance);
        }
        return __classPrivateFieldGet(this, _a, "f", _DatabaseService_instance);
    }
}
exports.DatabaseService = DatabaseService;
_a = DatabaseService;
_DatabaseService_instance = { value: null };
