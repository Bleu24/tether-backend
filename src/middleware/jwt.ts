import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

const COOKIE_NAME = "auth_token";

function parseCookie(header?: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
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

export function jwtAuthenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const cookies = parseCookie(req.headers.cookie as string | undefined);
    const token = cookies[COOKIE_NAME];
    if (!token) return next();
    const payload = jwt.verify(token, env.JWT_SECRET) as { sub: string };
    const id = Number(payload.sub);
    if (!Number.isNaN(id) && id > 0) {
      res.locals.userId = id;
    }
  } catch {
    // ignore invalid token
  }
  next();
}

export function setAuthCookie(res: Response, userId: number) {
  const token = jwt.sign({ sub: String(userId) }, env.JWT_SECRET, { expiresIn: "30d" });
  // Cookie flags for production readiness
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${60 * 60 * 24 * 30}`,
  ];
  if (env.NODE_ENV === "production") attrs.push("Secure");
  if (env.COOKIE_DOMAIN) attrs.push(`Domain=${env.COOKIE_DOMAIN}`);
  res.setHeader("Set-Cookie", attrs.join("; "));
}

export function clearAuthCookie(res: Response) {
  const attrs = [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];
  if (env.NODE_ENV === "production") attrs.push("Secure");
  if (env.COOKIE_DOMAIN) attrs.push(`Domain=${env.COOKIE_DOMAIN}`);
  res.setHeader("Set-Cookie", attrs.join("; "));
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (typeof res.locals.userId === "number" && res.locals.userId > 0) return next();
  return res.status(401).json({ error: "Unauthorized" });
}
