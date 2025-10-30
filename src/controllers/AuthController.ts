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
      `SELECT id, name, email, password_hash, created_at, birthdate, gender, location, bio, photos, subscription_tier FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    const row = rows[0];
    if (!row) return this.fail(res, "Invalid email or password", 401);
    const ok = row.password_hash ? bcrypt.compareSync(password, row.password_hash) : false;
    if (!ok) return this.fail(res, "Invalid email or password", 401);

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
