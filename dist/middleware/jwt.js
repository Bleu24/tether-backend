"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwtAuthenticate = jwtAuthenticate;
exports.setAuthCookie = setAuthCookie;
exports.clearAuthCookie = clearAuthCookie;
exports.requireUser = requireUser;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const COOKIE_NAME = "auth_token";
function parseCookie(header) {
    const out = {};
    if (!header)
        return out;
    header.split(";").forEach((p) => {
        const idx = p.indexOf("=");
        if (idx > -1) {
            const k = p.slice(0, idx).trim();
            const v = decodeURIComponent(p.slice(idx + 1).trim());
            out[k] = v;
        }
    });
    return out;
}
function jwtAuthenticate(req, res, next) {
    try {
        const cookies = parseCookie(req.headers.cookie);
        const token = cookies[COOKIE_NAME];
        if (!token)
            return next();
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        const id = Number(payload.sub);
        if (!Number.isNaN(id) && id > 0) {
            res.locals.userId = id;
        }
    }
    catch {
        // ignore invalid token
    }
    next();
}
function setAuthCookie(res, userId) {
    const token = jsonwebtoken_1.default.sign({ sub: String(userId) }, env_1.env.JWT_SECRET, { expiresIn: "30d" });
    // Cookie flags for production readiness
    const explicit = process.env.COOKIE_SAMESITE; // prefer real env var to detect explicit overrides
    const sameSite = explicit ?? (env_1.env.NODE_ENV === "production" ? "None" : "Lax");
    const attrs = [
        `${COOKIE_NAME}=${encodeURIComponent(token)}`,
        "Path=/",
        "HttpOnly",
        `SameSite=${sameSite}`,
        `Max-Age=${60 * 60 * 24 * 30}`,
    ];
    if (env_1.env.NODE_ENV === "production")
        attrs.push("Secure");
    if (env_1.env.COOKIE_DOMAIN)
        attrs.push(`Domain=${env_1.env.COOKIE_DOMAIN}`);
    res.setHeader("Set-Cookie", attrs.join("; "));
}
function clearAuthCookie(res) {
    const explicit = process.env.COOKIE_SAMESITE;
    const sameSite = explicit ?? (env_1.env.NODE_ENV === "production" ? "None" : "Lax");
    const attrs = [
        `${COOKIE_NAME}=`,
        "Path=/",
        "HttpOnly",
        `SameSite=${sameSite}`,
        "Max-Age=0",
    ];
    if (env_1.env.NODE_ENV === "production")
        attrs.push("Secure");
    if (env_1.env.COOKIE_DOMAIN)
        attrs.push(`Domain=${env_1.env.COOKIE_DOMAIN}`);
    res.setHeader("Set-Cookie", attrs.join("; "));
}
function requireUser(req, res, next) {
    if (typeof res.locals.userId === "number" && res.locals.userId > 0)
        return next();
    return res.status(401).json({ error: "Unauthorized" });
}
