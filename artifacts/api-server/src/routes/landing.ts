import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  landingContent,
  landingCountryOperators,
  landingCountries,
  landingFaqs,
  landingFeatures,
  landingFounderProfile,
  landingGlobeBadges,
  landingMedia,
  landingOperators,
  landingSections,
  landingSiteSettings,
  legalPages,
  legalSections,
  newsletterCampaigns,
  newsletterSubscribers,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth";
import { sendResendBatch } from "../lib/resend";
import {
  getPublicObjectSearchPaths,
  getSignedObjectUrl,
  parseStoragePath,
} from "../lib/publicObjectStorage";

const router: IRouter = Router();

const resources = {
  media: { table: landingMedia, editable: ["slug", "kind", "sourcePath", "storagePath", "publicUrl", "mimeType", "altFr", "altEn", "width", "height", "isVisible"] },
  content: { table: landingContent, editable: ["contentKey", "locale", "group", "contentType", "value", "orderIndex", "isVisible"] },
  sections: { table: landingSections, editable: ["slug", "kind", "orderIndex", "eyebrowFr", "eyebrowEn", "titleFr", "titleEn", "bodyFr", "bodyEn", "imageKey", "isVisible"] },
  features: { table: landingFeatures, editable: ["slug", "group", "orderIndex", "titleFr", "titleEn", "bodyFr", "bodyEn", "iconKey", "imageKey", "isVisible"] },
  faqs: { table: landingFaqs, editable: ["orderIndex", "questionFr", "questionEn", "answerFr", "answerEn", "isVisible"] },
  countries: { table: landingCountries, editable: ["code", "nameFr", "nameEn", "flag", "tone", "orderIndex", "heroPositionX", "heroPositionY", "isVisible"] },
  operators: { table: landingOperators, editable: ["slug", "name", "logoKey", "background", "foreground", "isVisible"] },
  badges: { table: landingGlobeBadges, editable: ["operatorId", "positionX", "positionY", "orderIndex", "isVisible"] },
  legalPages: { table: legalPages, editable: ["slug", "titleFr", "titleEn", "introFr", "introEn", "isVisible"] },
  legalSections: { table: legalSections, editable: ["pageId", "sectionNumber", "titleFr", "titleEn", "bodyFr", "bodyEn", "orderIndex"] },
} as const;

const founderEditableFields = [
  "name", "roleFr", "roleEn", "shortBioFr", "shortBioEn", "storyFr", "storyEn",
  "visionFr", "visionEn", "educationFr", "educationEn", "missionFr", "missionEn",
  "photoKey", "linkedinUrl", "websiteUrl", "instagramUrl", "xUrl", "email", "isVisible",
] as const;

const siteSettingsEditableFields = [
  "supportEmail", "supportPhone", "websiteUrl", "linkedinUrl", "instagramUrl", "facebookUrl",
  "companyName", "legalForm", "legalAddress", "legalEmail", "footerAddressFlag", "footerAddressCountry", "footerAddress",
  "regulatorNameFr", "regulatorNameEn", "regulatorLogoKey", "googlePlayUrl", "appStoreUrl", "appGalleryUrl", "apkUrl",
] as const;

const founderContactFields = ["linkedinUrl", "websiteUrl", "instagramUrl", "xUrl", "email"] as const;
const siteContactFields = ["supportEmail", "supportPhone", "websiteUrl", "linkedinUrl", "instagramUrl", "facebookUrl", "legalEmail"] as const;
const siteLinkFields = ["websiteUrl", "linkedinUrl", "instagramUrl", "facebookUrl", "googlePlayUrl", "appStoreUrl", "appGalleryUrl", "apkUrl"] as const;
const siteEmailFields = ["supportEmail", "legalEmail"] as const;
const founderEmailFields = ["email"] as const;
type ResourceName = keyof typeof resources;

function resourceConfig(name: string) {
  return Object.prototype.hasOwnProperty.call(resources, name)
    ? resources[name as ResourceName]
    : undefined;
}

function editablePayload(name: ResourceName, body: unknown): Record<string, unknown> {
  const source = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const allowed = resources[name].editable as readonly string[];
  return Object.fromEntries(Object.entries(source).filter(([key, value]) => allowed.includes(key) && value !== undefined));
}

function trimContactFields(values: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      key,
      fields.includes(key) && typeof value === "string" ? value.trim() : value,
    ]),
  );
}

function normalizeOptionalHttpUrl(values: Record<string, unknown>, fieldName: string, allowRelative = false): void {
  const value = values[fieldName];
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  values[fieldName] = trimmed;
  if (!trimmed) return;
  if (/^\/(?!\/)/.test(trimmed)) {
    if (allowRelative) return;
    throw new Error(`${fieldName} doit être une URL publique complète.`);
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`${fieldName} doit être une URL publique valide.`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${fieldName} doit utiliser http:// ou https://.`);
  }
}

function normalizeOptionalEmail(values: Record<string, unknown>, fieldName: string, label: string): void {
  const value = values[fieldName];
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  values[fieldName] = trimmed;
  if (!trimmed) return;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error(`${label} doit être une adresse email valide.`);
  }
}

function normalizePublicLinks(values: Record<string, unknown>, fields: readonly string[], relativeFields: readonly string[] = []): void {
  for (const fieldName of fields) normalizeOptionalHttpUrl(values, fieldName, relativeFields.includes(fieldName));
}
async function getLandingBundle() {
  const [
    media,
    content,
    sections,
    features,
    faqs,
    countries,
    operators,
    countryOperators,
    globeBadges,
    pages,
    pageSections,
    founderProfiles,
    siteSettings,
  ] = await Promise.all([
    db.select().from(landingMedia).orderBy(asc(landingMedia.id)),
    db.select().from(landingContent).orderBy(asc(landingContent.orderIndex), asc(landingContent.id)),
    db.select().from(landingSections).orderBy(asc(landingSections.orderIndex)),
    db.select().from(landingFeatures).orderBy(asc(landingFeatures.orderIndex)),
    db.select().from(landingFaqs).orderBy(asc(landingFaqs.orderIndex)),
    db.select().from(landingCountries).orderBy(asc(landingCountries.orderIndex)),
    db.select().from(landingOperators).orderBy(asc(landingOperators.id)),
    db.select().from(landingCountryOperators).orderBy(asc(landingCountryOperators.countryId), asc(landingCountryOperators.orderIndex)),
    db.select().from(landingGlobeBadges).orderBy(asc(landingGlobeBadges.orderIndex)),
    db.select().from(legalPages).orderBy(asc(legalPages.id)),
    db.select().from(legalSections).orderBy(asc(legalSections.pageId), asc(legalSections.orderIndex)),
    db.select().from(landingFounderProfile).orderBy(asc(landingFounderProfile.id)),
    db.select().from(landingSiteSettings).orderBy(asc(landingSiteSettings.id)),
  ]);

  return { media, content, sections, features, faqs, countries, operators, countryOperators, globeBadges, legalPages: pages, legalSections: pageSections, founder: founderProfiles[0] ?? null, settings: siteSettings[0] ?? null };
}

function normalizeNewsletterEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function newsletterPayload(body: unknown): { subject: string; previewText: string | null; bodyHtml: string } | { error: string } {
  const source = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const subject = typeof source.subject === "string" ? source.subject.trim() : "";
  const previewText = typeof source.previewText === "string" ? source.previewText.trim() : "";
  const bodyHtml = typeof source.bodyHtml === "string" ? source.bodyHtml.trim() : "";
  if (!subject || subject.length > 180) return { error: "L’objet est requis et doit contenir 180 caractères maximum." };
  if (!bodyHtml || bodyHtml.length > 500_000) return { error: "Le contenu de la campagne est requis et doit contenir 500 Ko maximum." };
  return { subject, previewText: previewText ? previewText.slice(0, 240) : null, bodyHtml };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

function publicOrigin(req: { protocol: string; headers: Record<string, string | string[] | undefined>; get(name: string): string | undefined }): string {
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  const forwardedHost = String(req.headers["x-forwarded-host"] ?? "").split(",")[0].trim();
  const host = forwardedHost || req.get("host") || "";
  const protocol = forwardedProtocol || req.protocol || "https";
  if (!host) throw new Error("Impossible de déterminer l’URL publique du site.");
  return `${protocol}://${host}`;
}

function publicSiteAssetUrl(origin: string, assetName: string): string {
  const configuredSite = process.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  const basePath = process.env.BASE_PATH?.trim().replace(/\/+$/, "") || "";
  return `${configuredSite || origin}${basePath}/${assetName}`;
}

async function getNewsletterAdminBundle() {
  const [subscribers, campaigns] = await Promise.all([
    db.select({
      id: newsletterSubscribers.id,
      email: newsletterSubscribers.email,
      status: newsletterSubscribers.status,
      source: newsletterSubscribers.source,
      subscribedAt: newsletterSubscribers.subscribedAt,
      unsubscribedAt: newsletterSubscribers.unsubscribedAt,
      createdAt: newsletterSubscribers.createdAt,
      updatedAt: newsletterSubscribers.updatedAt,
    }).from(newsletterSubscribers).orderBy(desc(newsletterSubscribers.createdAt)),
    db.select().from(newsletterCampaigns).orderBy(desc(newsletterCampaigns.createdAt)),
  ]);
  return {
    subscribers,
    campaigns,
    stats: {
      totalSubscribers: subscribers.length,
      activeSubscribers: subscribers.filter((subscriber) => subscriber.status === "subscribed").length,
      totalCampaigns: campaigns.length,
      sentCampaigns: campaigns.filter((campaign) => campaign.status === "sent").length,
    },
  };
}

router.post("/newsletter/subscribe", async (req, res): Promise<void> => {
  const email = normalizeNewsletterEmail(req.body?.email);
  if (!email) {
    res.status(400).json({ error: "Saisis une adresse email valide." });
    return;
  }
  const token = randomUUID();
  await db.insert(newsletterSubscribers).values({
    email,
    status: "subscribed",
    source: "landing",
    unsubscribeToken: token,
    subscribedAt: new Date(),
    unsubscribedAt: null,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: newsletterSubscribers.email,
    set: {
      status: "subscribed",
      unsubscribeToken: token,
      subscribedAt: new Date(),
      unsubscribedAt: null,
      updatedAt: new Date(),
    },
  });
  res.status(201).json({ ok: true });
});

router.get("/newsletter/unsubscribe/:token", async (req, res): Promise<void> => {
  const token = typeof req.params.token === "string" ? req.params.token.trim() : "";
  if (!token) {
    res.status(400).type("html").send("<h1>Lien de désabonnement invalide.</h1>");
    return;
  }
  const [updated] = await db.update(newsletterSubscribers)
    .set({ status: "unsubscribed", unsubscribedAt: new Date(), updatedAt: new Date() })
    .where(eq(newsletterSubscribers.unsubscribeToken, token))
    .returning({ id: newsletterSubscribers.id });
  if (!updated) {
    res.status(404).type("html").send("<h1>Lien de désabonnement invalide ou déjà expiré.</h1>");
    return;
  }
  res.type("html").send("<!doctype html><html lang=\"fr\"><meta charset=\"utf-8\"><title>Désabonnement confirmé · SendFlow</title><body style=\"font-family:Arial,sans-serif;max-width:560px;margin:80px auto;padding:24px;color:#192231\"><h1>Désabonnement confirmé</h1><p>Cette adresse ne recevra plus les campagnes SendFlow.</p></body></html>");
});

router.get("/admin/newsletter", requireAdmin, async (_req, res): Promise<void> => {
  res.json(await getNewsletterAdminBundle());
});

router.patch("/admin/newsletter/subscribers/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const status = req.body?.status;
  if (!Number.isInteger(id) || (status !== "subscribed" && status !== "unsubscribed")) {
    res.status(400).json({ error: "Statut d’abonné invalide." });
    return;
  }
  const [updated] = await db.update(newsletterSubscribers).set({
    status,
    subscribedAt: status === "subscribed" ? new Date() : undefined,
    unsubscribedAt: status === "unsubscribed" ? new Date() : null,
    updatedAt: new Date(),
  }).where(eq(newsletterSubscribers.id, id)).returning({
    id: newsletterSubscribers.id,
    email: newsletterSubscribers.email,
    status: newsletterSubscribers.status,
    source: newsletterSubscribers.source,
    subscribedAt: newsletterSubscribers.subscribedAt,
    unsubscribedAt: newsletterSubscribers.unsubscribedAt,
    createdAt: newsletterSubscribers.createdAt,
    updatedAt: newsletterSubscribers.updatedAt,
  });
  if (!updated) {
    res.status(404).json({ error: "Abonné introuvable." });
    return;
  }
  res.json(updated);
});

router.delete("/admin/newsletter/subscribers/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Identifiant d’abonné invalide." });
    return;
  }
  const [deleted] = await db.delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id)).returning({ id: newsletterSubscribers.id });
  if (!deleted) {
    res.status(404).json({ error: "Abonné introuvable." });
    return;
  }
  res.sendStatus(204);
});

router.post("/admin/newsletter/campaigns", requireAdmin, async (req, res): Promise<void> => {
  const payload = newsletterPayload(req.body);
  if ("error" in payload) {
    res.status(400).json({ error: payload.error });
    return;
  }
  const [created] = await db.insert(newsletterCampaigns).values(payload).returning();
  res.status(201).json(created);
});

router.patch("/admin/newsletter/campaigns/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Identifiant de campagne invalide." });
    return;
  }
  const [existing] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Campagne introuvable." });
    return;
  }
  if (existing.status === "sent" || existing.status === "sending") {
    res.status(409).json({ error: "Cette campagne ne peut plus être modifiée." });
    return;
  }
  const payload = newsletterPayload(req.body);
  if ("error" in payload) {
    res.status(400).json({ error: payload.error });
    return;
  }
  const [updated] = await db.update(newsletterCampaigns).set({
    ...payload,
    status: "draft",
    lastError: null,
    updatedAt: new Date(),
  }).where(eq(newsletterCampaigns.id, id)).returning();
  res.json(updated);
});

router.delete("/admin/newsletter/campaigns/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Identifiant de campagne invalide." });
    return;
  }
  const [existing] = await db.select({ id: newsletterCampaigns.id, status: newsletterCampaigns.status }).from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Campagne introuvable." });
    return;
  }
  if (existing.status === "sent" || existing.status === "sending") {
    res.status(409).json({ error: "Cette campagne ne peut plus être supprimée." });
    return;
  }
  await db.delete(newsletterCampaigns).where(eq(newsletterCampaigns.id, id));
  res.sendStatus(204);
});

router.post("/admin/newsletter/campaigns/:id/send", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Identifiant de campagne invalide." });
    return;
  }
  const [campaign] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id)).limit(1);
  if (!campaign) {
    res.status(404).json({ error: "Campagne introuvable." });
    return;
  }
  if (campaign.status === "sent" || campaign.status === "sending") {
    res.status(409).json({ error: "Cette campagne a déjà été envoyée ou est en cours d’envoi." });
    return;
  }
  const subscribers = await db.select({
    email: newsletterSubscribers.email,
    unsubscribeToken: newsletterSubscribers.unsubscribeToken,
  }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, "subscribed"));
  if (subscribers.length === 0) {
    res.status(400).json({ error: "Aucun abonné actif ne peut recevoir cette campagne." });
    return;
  }

  await db.update(newsletterCampaigns).set({
    status: "sending",
    recipientCount: subscribers.length,
    sentCount: 0,
    failedCount: 0,
    lastError: null,
    updatedAt: new Date(),
  }).where(eq(newsletterCampaigns.id, id));

  try {
    const [settings] = await db.select({ supportEmail: landingSiteSettings.supportEmail }).from(landingSiteSettings).orderBy(asc(landingSiteSettings.id)).limit(1);
    const from = process.env.RESEND_FROM_EMAIL?.trim() || settings?.supportEmail?.trim();
    if (!from) throw new Error("Aucune adresse expéditrice Resend n’est configurée.");
     const origin = process.env.PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || publicOrigin(req);
     const logoUrl = publicSiteAssetUrl(origin, "sendflow-wordmark.png");
    const batches = [];
    for (let index = 0; index < subscribers.length; index += 100) batches.push(subscribers.slice(index, index + 100));
    let sentCount = 0;
    for (const batch of batches) {
      await sendResendBatch(batch.map((subscriber) => {
        const unsubscribeUrl = `${origin}/api/newsletter/unsubscribe/${encodeURIComponent(subscriber.unsubscribeToken)}`;
         const withLogo = campaign.bodyHtml.replaceAll("{{logo_url}}", escapeHtml(logoUrl));
         const body = withLogo.includes("{{unsubscribe_url}}")
           ? withLogo.replaceAll("{{unsubscribe_url}}", escapeHtml(unsubscribeUrl))
           : `${withLogo}<hr style="margin:32px 0;border:0;border-top:1px solid #e5e7eb"><p style="font:12px Arial,sans-serif;color:#667386">Vous recevez cet email parce que vous avez demandé les nouvelles de SendFlow. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#1769ff">Se désabonner</a></p>`;
        return { from, to: [subscriber.email], subject: campaign.subject, html: body };
      }));
      sentCount += batch.length;
      await db.update(newsletterCampaigns).set({ sentCount, failedCount: subscribers.length - sentCount, updatedAt: new Date() }).where(eq(newsletterCampaigns.id, id));
    }
    const [sent] = await db.update(newsletterCampaigns).set({
      status: "sent",
      sentAt: new Date(),
      failedCount: 0,
      lastError: null,
      updatedAt: new Date(),
    }).where(eq(newsletterCampaigns.id, id)).returning();
    res.json(sent);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Resend n’a pas pu envoyer la campagne.";
    req.log.error({ err: error, campaignId: id }, "Newsletter campaign send failed");
    const [failed] = await db.update(newsletterCampaigns).set({
      status: "failed",
      failedCount: subscribers.length,
      lastError: message.slice(0, 1000),
      updatedAt: new Date(),
    }).where(eq(newsletterCampaigns.id, id)).returning();
    res.status(502).json({ error: message, campaign: failed });
  }
});

router.get("/landing", async (_req, res): Promise<void> => {
  res.json(await getLandingBundle());
});

router.get("/admin/landing", requireAdmin, async (_req, res): Promise<void> => {
  res.json(await getLandingBundle());
});

router.put("/admin/landing/founder", requireAdmin, async (req, res): Promise<void> => {
  const source = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const values = trimContactFields(
    Object.fromEntries(
      Object.entries(source).filter(([key, value]) => founderEditableFields.includes(key as (typeof founderEditableFields)[number]) && value !== undefined),
    ),
    founderContactFields,
  );
  try {
    normalizePublicLinks(values, founderContactFields.filter((field) => field !== "email"));
    normalizeOptionalEmail(values, "email", "L’email du fondateur");
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Les coordonnées du fondateur sont invalides." });
    return;
  }
  if (!values.name || !values.roleFr || !values.roleEn || !values.shortBioFr || !values.shortBioEn || !values.storyFr || !values.storyEn || !values.visionFr || !values.visionEn || !values.educationFr || !values.educationEn || !values.missionFr || !values.missionEn) {
    res.status(400).json({ error: "Le nom, les rôles, les biographies, le parcours, la vision et la mission sont requis en français et en anglais." });
    return;
  }
  const existing = await db.select({ id: landingFounderProfile.id }).from(landingFounderProfile).orderBy(asc(landingFounderProfile.id)).limit(1);
  const [saved] = existing[0]
    ? await db.update(landingFounderProfile).set(values).where(eq(landingFounderProfile.id, existing[0].id)).returning()
    : await db.insert(landingFounderProfile).values(values as typeof landingFounderProfile.$inferInsert).returning();
  res.json(saved);
});

router.put("/admin/landing/settings", requireAdmin, async (req, res): Promise<void> => {
  const source = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const values = trimContactFields(
    Object.fromEntries(
      Object.entries(source).filter(([key, value]) => siteSettingsEditableFields.includes(key as (typeof siteSettingsEditableFields)[number]) && value !== undefined),
    ),
    [...siteContactFields, ...siteLinkFields],
  );
  try {
    normalizePublicLinks(values, siteLinkFields, ["apkUrl"]);
    for (const fieldName of siteEmailFields) {
      normalizeOptionalEmail(values, fieldName, fieldName === "supportEmail" ? "L’email du support" : "L’email légal");
    }
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Les coordonnées du site sont invalides." });
    return;
  }
  if (typeof values.supportEmail !== "string" || !values.supportEmail.trim()) {
    res.status(400).json({ error: "L’adresse email du support est requise." });
    return;
  }
  const existing = await db.select({ id: landingSiteSettings.id }).from(landingSiteSettings).orderBy(asc(landingSiteSettings.id)).limit(1);
  const [saved] = existing[0]
    ? await db.update(landingSiteSettings).set(values).where(eq(landingSiteSettings.id, existing[0].id)).returning()
    : await db.insert(landingSiteSettings).values(values as typeof landingSiteSettings.$inferInsert).returning();
  res.json(saved);
});

router.post("/admin/landing/media/upload-url", requireAdmin, async (req, res): Promise<void> => {
  const name = req.params.resource as string;
  const contentType = typeof req.body?.contentType === "string" ? req.body.contentType.trim().toLowerCase() : "";
  const size = Number(req.body?.size);
  if (!name || !contentType.startsWith("image/") || !Number.isFinite(size) || size <= 0 || size > 10 * 1024 * 1024) {
    res.status(400).json({ error: "Un fichier image valide de 10 Mo maximum est requis." });
    return;
  }

  try {
    const publicRoot = getPublicObjectSearchPaths()[0];
    const { bucketName, objectName: publicObjectRoot } = parseStoragePath(publicRoot);
    const safeName = name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "image";
    const relativePath = `landing/admin/${randomUUID()}-${safeName}`;
    const objectName = `${publicObjectRoot.replace(/\/+$/, "")}/${relativePath}`;
    const uploadURL = await getSignedObjectUrl({ bucketName, objectName, method: "PUT" });
    res.json({
      uploadURL,
      storagePath: `${publicRoot.replace(/\/+$/, "")}/${relativePath}`,
      publicUrl: `/api/storage/public-objects/${relativePath}`,
    });
  } catch (error) {
    req.log.error({ err: error }, "Unable to prepare admin media upload");
    res.status(503).json({ error: "Le stockage des images est indisponible pour le moment. Réessaie lorsque le service sera disponible." });
  }
});

router.patch("/admin/landing/:resource/:id", requireAdmin, async (req, res): Promise<void> => {
  const name = req.params.resource as string;
  const config = resourceConfig(name);
  if (!config) {
    res.status(404).json({ error: "Unknown landing resource" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid resource id" });
    return;
  }
  const values = editablePayload(name as ResourceName, req.body);
  if (Object.keys(values).length === 0) {
    res.status(400).json({ error: "No editable fields supplied" });
    return;
  }
  const table = config.table as any;
  const [updated] = await db.update(table).set(values).where(eq(table.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  res.json(updated);
});

router.post("/admin/landing/:resource", requireAdmin, async (req, res): Promise<void> => {
  const name = req.params.resource as string;
  const config = resourceConfig(name);
  if (!config) {
    res.status(404).json({ error: "Unknown landing resource" });
    return;
  }
  const values = editablePayload(name as ResourceName, req.body);
  if (Object.keys(values).length === 0) {
    res.status(400).json({ error: "No editable fields supplied" });
    return;
  }
  const createdRows = (await db.insert(config.table as any).values(values).returning()) as any[];
  const created = createdRows[0];
  res.status(201).json(created);
});

router.delete("/admin/landing/:resource/:id", requireAdmin, async (req, res): Promise<void> => {
  const name = req.params.resource as string;
  const config = resourceConfig(name);
  if (!config) {
    res.status(404).json({ error: "Unknown landing resource" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Invalid resource id" });
    return;
  }
  const table = config.table as any;
  const deletedRows = (await db.delete(table).where(eq(table.id, id)).returning()) as any[];
  const deleted = deletedRows[0];
  if (!deleted) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  res.sendStatus(204);
});

router.put("/admin/landing/countries/:countryId/operators", requireAdmin, async (req, res): Promise<void> => {
  const countryId = Number(req.params.countryId);
  const operatorIds = Array.isArray(req.body?.operatorIds)
    ? req.body.operatorIds.map(Number).filter(Number.isInteger)
    : [];
  if (!Number.isInteger(countryId)) {
    res.status(400).json({ error: "Invalid country id" });
    return;
  }
  await db.transaction(async (tx) => {
    await tx.delete(landingCountryOperators).where(eq(landingCountryOperators.countryId, countryId));
    if (operatorIds.length > 0) {
      await tx.insert(landingCountryOperators).values(
        operatorIds.map((operatorId: number, orderIndex: number) => ({ countryId, operatorId, orderIndex })),
      );
    }
  });
  res.json({ countryId, operatorIds });
});

export { getLandingBundle };
export default router;
