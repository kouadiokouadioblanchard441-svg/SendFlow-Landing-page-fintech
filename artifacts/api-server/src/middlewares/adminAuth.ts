import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextFunction, Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { adminSessions, adminUsers, db } from "@workspace/db";
import { isAllowedMutationOrigin } from "./security";

const scryptAsync = promisify(scrypt);
export const ADMIN_SESSION_COOKIE = "sendflow_admin_session";
const SESSION_DAYS = 7;

export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export async function verifyAdminPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function readAdminSessionToken(req: Request): string | null {
  const cookies = req.headers.cookie?.split(";") ?? [];
  const prefix = `${ADMIN_SESSION_COOKIE}=`;
  const entry = cookies.find((cookie) => cookie.trim().startsWith(prefix));
  if (!entry) return null;
  try {
    const token = decodeURIComponent(entry.trim().slice(prefix.length));
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  } catch {
    return null;
  }
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const hashAdminPanelToken = hashSessionToken;

export function setAdminSessionCookie(res: Response, token: string): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}${secure}`,
  );
}

export function clearAdminSessionCookie(res: Response): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${ADMIN_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

export async function getAdminUser(req: Request) {
  const token = readAdminSessionToken(req);
  if (!token) return null;
  const now = new Date();
  const [session] = await db
    .select({ user: adminUsers, session: adminSessions })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminUsers.id, adminSessions.userId))
    .where(and(eq(adminSessions.tokenHash, hashSessionToken(token)), gt(adminSessions.expiresAt, now), eq(adminUsers.isActive, true)))
    .limit(1);
  return session?.user ?? null;
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.get("origin");
    if (!isAllowedMutationOrigin(origin)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }
  }
  const user = await getAdminUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}