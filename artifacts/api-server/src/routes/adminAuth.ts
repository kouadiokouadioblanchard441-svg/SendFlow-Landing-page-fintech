import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq, lt } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { adminSessions, adminUsers, db } from "@workspace/db";
import {
  clearAdminSessionCookie,
  getAdminUser,
  hashAdminPanelToken,
  hashAdminPassword,
  readAdminSessionToken,
  hashSessionToken,
  setAdminSessionCookie,
  verifyAdminPassword,
} from "../middlewares/adminAuth";
import { createRateLimiter, isAllowedMutationOrigin } from "../middlewares/security";
import { adminLoginSchema, panelLookupSchema } from "../lib/requestValidation";

const router: IRouter = Router();
const SESSION_DAYS = 7;
const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: "Trop de tentatives de connexion. Réessaie dans quelques minutes.",
});
const panelLookupRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 30,
});

function rejectUntrustedOrigin(req: Request, res: Response): boolean {
  const origin = req.get("origin");
  if (!isAllowedMutationOrigin(origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return true;
  }
  return false;
}

router.post("/admin/auth/login", loginRateLimit, async (req, res): Promise<void> => {
  if (rejectUntrustedOrigin(req, res)) return;
  const parsed = adminLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Panel access, email and password are invalid" });
    return;
  }
  const { email, password, panelToken, panelEmail } = parsed.data;

  const [user] = await db.select().from(adminUsers).where(and(eq(adminUsers.email, email), eq(adminUsers.isActive, true))).limit(1);
  if (
    !user ||
    !user.panelTokenHash ||
    !user.panelEmailHash ||
    hashAdminPanelToken(panelToken) !== user.panelTokenHash ||
    hashAdminPanelToken(panelEmail) !== user.panelEmailHash ||
    !(await verifyAdminPassword(password, user.passwordHash))
  ) {
    res.status(401).json({ error: "Invalid panel access, email or password" });
    return;
  }

  const token = randomBytes(32).toString("base64url");
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
  await db.insert(adminSessions).values({
    userId: user.id,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
  });
  await db.update(adminUsers).set({ lastLoginAt: new Date(), updatedAt: new Date() }).where(eq(adminUsers.id, user.id));
  setAdminSessionCookie(res, token);
  res.json({ user: { id: user.id, email: user.email } });
});

router.post("/admin/auth/panel/verify", panelLookupRateLimit, async (req, res): Promise<void> => {
  if (rejectUntrustedOrigin(req, res)) return;
  const parsed = panelLookupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(404).json({ error: "Panel not found" });
    return;
  }
  const { token, email: panelEmail } = parsed.data;

  const [user] = await db
    .select({ id: adminUsers.id, email: adminUsers.email })
    .from(adminUsers)
    .where(and(
      eq(adminUsers.panelTokenHash, hashAdminPanelToken(token)),
      eq(adminUsers.panelEmailHash, hashAdminPanelToken(panelEmail.toLowerCase())),
      eq(adminUsers.isActive, true),
    ))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Panel not found" });
    return;
  }
  res.json({ user });
});

router.get("/admin/auth/me", async (req, res): Promise<void> => {
  const user = await getAdminUser(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  res.json({ user: { id: user.id, email: user.email } });
});

router.post("/admin/auth/logout", async (req, res): Promise<void> => {
  if (rejectUntrustedOrigin(req, res)) return;
  const user = await getAdminUser(req);
  if (user) {
    const token = readAdminSessionToken(req);
    if (token) await db.delete(adminSessions).where(eq(adminSessions.tokenHash, hashSessionToken(token)));
  }
  clearAdminSessionCookie(res);
  res.sendStatus(204);
});

export default router;