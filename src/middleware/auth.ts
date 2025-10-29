import { Request, Response, NextFunction } from "express";

/**
 * Development auth middleware.
 * - Reads user id from `x-user-id` header or `userId` query string.
 * - If numeric, sets `res.locals.userId` for downstream handlers.
 * - Does not enforce authentication by default.
 *
 * Use `requireUser` for endpoints that need a logged-in user during development.
 */
export function devAuthenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.header("x-user-id") ?? req.header("X-User-Id");
  const query = (req.query?.userId as string | undefined) ?? undefined;
  const candidate = header ?? query ?? undefined;
  const id = candidate ? Number(candidate) : NaN;
  if (!Number.isNaN(id) && id > 0) {
    res.locals.userId = id;
  }
  next();
}

/**
 * Enforce that a user id is present (from devAuthenticate).
 */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (typeof res.locals.userId === "number" && res.locals.userId > 0) return next();
  return res.status(401).json({ error: "Unauthorized: provide X-User-Id header or userId query param" });
}
