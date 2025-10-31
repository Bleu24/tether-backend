"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devAuthenticate = devAuthenticate;
exports.requireUser = requireUser;
/**
 * Development auth middleware.
 * - Reads user id from `x-user-id` header or `userId` query string.
 * - If numeric, sets `res.locals.userId` for downstream handlers.
 * - Does not enforce authentication by default.
 *
 * Use `requireUser` for endpoints that need a logged-in user during development.
 */
function devAuthenticate(req, res, next) {
    const header = req.header("x-user-id") ?? req.header("X-User-Id");
    const query = req.query?.userId ?? undefined;
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
function requireUser(req, res, next) {
    if (typeof res.locals.userId === "number" && res.locals.userId > 0)
        return next();
    return res.status(401).json({ error: "Unauthorized: provide X-User-Id header or userId query param" });
}
