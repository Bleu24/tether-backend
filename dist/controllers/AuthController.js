"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const BaseController_1 = require("./BaseController");
const UserService_1 = require("../services/UserService");
const UserRepository_1 = require("../repositories/UserRepository");
const DatabaseService_1 = require("../services/DatabaseService");
const jwt_1 = require("../middleware/jwt");
const jwt_2 = require("../middleware/jwt");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
class AuthController extends BaseController_1.BaseController {
    constructor() {
        super(...arguments);
        this.users = new UserService_1.UserService(new UserRepository_1.UserRepository(DatabaseService_1.DatabaseService.get()));
        this.signup = this.handler(async (req, res) => {
            // signup: create user using name/email and optional password; hash if provided
            // If an account with this email was soft-deleted, prefer restoring data from snapshot
            const email = String(req.body?.email || "").toLowerCase();
            if (email) {
                const db = DatabaseService_1.DatabaseService.get();
                const { rows } = await db.query(`SELECT id, is_deleted FROM users WHERE email = ? LIMIT 1`, [email]);
                const existing = rows[0];
                if (existing && existing.is_deleted) {
                    // Restore the deleted account by marking it active again and updating fields from snapshot
                    const { SoftDeletedUserRepository } = require("../repositories/SoftDeletedUserRepository");
                    const sdu = new SoftDeletedUserRepository(db);
                    const snap = await sdu.findLatestByEmail(email);
                    await db.execute(`UPDATE users SET is_deleted = 0, name = COALESCE(?, name), gender = COALESCE(?, gender), location = COALESCE(?, location), bio = COALESCE(?, bio), photos = COALESCE(?, photos), setup_complete = 1 WHERE id = ?`, [
                        snap?.name ?? null,
                        snap?.gender ?? null,
                        snap?.location ?? null,
                        snap?.bio ?? null,
                        JSON.stringify(snap?.photos ?? []),
                        existing.id,
                    ]);
                    // Also restore preferences if available
                    if (snap?.preferences) {
                        try {
                            await db.execute(`REPLACE INTO profile_preferences (user_id, min_age, max_age, distance, gender_preference, interests) VALUES (?,?,?,?,?,?)`, [
                                existing.id,
                                snap.preferences.min_age ?? 18,
                                snap.preferences.max_age ?? 99,
                                snap.preferences.distance ?? 50,
                                snap.preferences.gender_preference ?? 'any',
                                JSON.stringify(snap.preferences.interests ?? []),
                            ]);
                        }
                        catch { }
                    }
                    (0, jwt_1.setAuthCookie)(res, existing.id);
                    const repo = new UserRepository_1.UserRepository(db);
                    const restored = await repo.findById(existing.id);
                    return this.created(res, restored);
                }
            }
            const user = await this.users.create(req.body);
            (0, jwt_1.setAuthCookie)(res, user.id);
            return this.created(res, user);
        });
        this.login = this.handler(async (req, res) => {
            // password login
            const email = String(req.body?.email || "").toLowerCase();
            const password = String(req.body?.password || "");
            if (!email)
                return this.fail(res, "email is required", 400);
            if (!password)
                return this.fail(res, "password is required", 400);
            const repo = new UserRepository_1.UserRepository(DatabaseService_1.DatabaseService.get());
            // Lightweight direct query for hash
            const { rows } = await DatabaseService_1.DatabaseService.get().query(`SELECT id, name, email, password_hash, created_at, birthdate, gender, location, bio, photos, subscription_tier, is_deleted FROM users WHERE email = ? LIMIT 1`, [email]);
            const row = rows[0];
            if (!row)
                return this.fail(res, "Invalid email or password", 401);
            const ok = row.password_hash ? bcryptjs_1.default.compareSync(password, row.password_hash) : false;
            if (!ok)
                return this.fail(res, "Invalid email or password", 401);
            if (row.is_deleted) {
                // Signal soft-deleted flow; client should redirect to signup and we can assist with autofill via soft_deleted_users
                return this.fail(res, "Account deleted", 409);
            }
            // Map minimal user response (no password)
            const found = await repo.findById(row.id);
            if (!found)
                return this.fail(res, "User not found", 404);
            (0, jwt_1.setAuthCookie)(res, row.id);
            return this.ok(res, found);
        });
        this.logout = this.handler(async (_req, res) => {
            (0, jwt_2.clearAuthCookie)(res);
            return this.ok(res, { success: true });
        });
    }
}
exports.AuthController = AuthController;
