import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { UserService } from "../services/UserService";
import { UserRepository } from "../repositories/UserRepository";
import { DatabaseService } from "../services/DatabaseService";
import { setAuthCookie } from "../middleware/jwt";
import { clearAuthCookie } from "../middleware/jwt";
import bcrypt from "bcryptjs";

export class AuthController extends BaseController {
  private users = new UserService(new UserRepository(DatabaseService.get()));

  signup = this.handler(async (req: Request, res: Response) => {
    // signup: create user using name/email and optional password; hash if provided
    // If an account with this email was soft-deleted, prefer restoring data from snapshot
    const email = String(req.body?.email || "").toLowerCase();
    if (email) {
      const db = DatabaseService.get();
      const { rows } = await db.query<any>(`SELECT id, is_deleted FROM users WHERE email = ? LIMIT 1`, [email]);
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
          } catch {}
        }
        setAuthCookie(res, existing.id);
        const repo = new UserRepository(db);
        const restored = await repo.findById(existing.id);
        return this.created(res, restored);
      }
    }

    const user = await this.users.create(req.body);
    setAuthCookie(res, user.id);
    return this.created(res, user);
  });

  login = this.handler(async (req: Request, res: Response) => {
    // password login
    const email = String(req.body?.email || "").toLowerCase();
    const password = String(req.body?.password || "");
    if (!email) return this.fail(res, "email is required", 400);
    if (!password) return this.fail(res, "password is required", 400);

    const repo = new UserRepository(DatabaseService.get());
    // Lightweight direct query for hash
    const { rows } = await DatabaseService.get().query<any>(
      `SELECT id, name, email, password_hash, created_at, birthdate, gender, location, bio, photos, subscription_tier, is_deleted FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    const row = rows[0];
    if (!row) return this.fail(res, "Invalid email or password", 401);
    const ok = row.password_hash ? bcrypt.compareSync(password, row.password_hash) : false;
    if (!ok) return this.fail(res, "Invalid email or password", 401);
    if (row.is_deleted) {
      // Signal soft-deleted flow; client should redirect to signup and we can assist with autofill via soft_deleted_users
      return this.fail(res, "Account deleted", 409);
    }

    // Map minimal user response (no password)
    const found = await repo.findById(row.id);
    if (!found) return this.fail(res, "User not found", 404);
    setAuthCookie(res, row.id);
    return this.ok(res, found);
  });

  logout = this.handler(async (_req: Request, res: Response) => {
    clearAuthCookie(res);
    return this.ok(res, { success: true });
  });
}
