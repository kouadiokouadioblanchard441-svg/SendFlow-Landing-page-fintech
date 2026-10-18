import express, { Router, type IRouter } from "express";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
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
  isPleskMediaStorageEnabled,
  parseStoragePath,
  storePleskPublicObject,
} from "../lib/publicObjectStorage";
import { filterPublicLandingBundle } from "../lib/landingVisibility";
import { createRateLimiter } from "../middlewares/security";
import { getPublicSiteUrl } from "../lib/publicSiteUrl";
import {
  countryOperatorAssignmentSchema,
  founderProfileSchema,
  imageBytesMatchMimeType,
  mediaUploadHeadersSchema,
  newsletterCampaignSchema,
  newsletterSubscriberStatusSchema,
  newsletterSubscribeSchema,
  parseLandingResourcePayload,
  parsePositivePathId,
  siteSettingsSchema,
} from "../lib/requestValidation";

const router: IRouter = Router();
const newsletterSubscribeRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Trop de demandes d’inscription. Réessaie plus tard.",
});
const mediaUploadRateLimit = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: "Trop de téléversements. Réessaie plus tard.",
});
const mediaUploadBody = express.raw({
  type: ["image/png", "image/jpeg", "image/webp"],
  limit: "10mb",
});

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

const founderContactFields = ["linkedinUrl", "websiteUrl", "instagramUrl", "xUrl", "email"] as const;
const siteContactFields = [
  "supportEmail", "supportPhone", "websiteUrl", "linkedinUrl", "instagramUrl", "facebookUrl", "whatsappUrl", "legalEmail",
  "homeContactEmail", "homeContactPhone", "homeContactWhatsapp",
  "featuresContactEmail", "featuresContactPhone", "featuresContactWhatsapp",
  "securityContactEmail", "securityContactPhone", "securityContactWhatsapp",
  "downloadContactEmail", "downloadContactPhone", "downloadContactWhatsapp",
  "aboutContactEmail", "aboutContactPhone", "aboutContactWhatsapp",
  "legalContactEmail", "legalContactPhone", "legalContactWhatsapp",
] as const;
const siteLinkFields = ["websiteUrl", "linkedinUrl", "instagramUrl", "facebookUrl", "whatsappUrl", "googlePlayUrl", "appStoreUrl", "appGalleryUrl", "apkUrl"] as const;
const siteEmailFields = [
  "supportEmail", "legalEmail",
  "homeContactEmail", "featuresContactEmail", "securityContactEmail",
  "downloadContactEmail", "aboutContactEmail", "legalContactEmail",
] as const;
const founderEmailFields = ["email"] as const;
type ResourceName = keyof typeof resources;
const ABOUT_CAROUSEL_KIND = "about-hero-slide";
const ABOUT_CAROUSEL_IMAGE_KEYS = new Set([
  "about-hero-woman",
  "sendflow-about-professional-01",
  "sendflow-about-professional-02",
  "sendflow-about-professional-03",
  "sendflow-about-professional-04",
  "sendflow-about-professional-05",
]);
const ABOUT_CAROUSEL_DEFAULTS = [
  {
    slug: "about-hero-slide-01",
    kind: ABOUT_CAROUSEL_KIND,
    orderIndex: 1,
    titleFr: "Portrait illustratif d’une professionnelle présentant un téléphone SendFlow",
    titleEn: "Illustrative portrait of a professional woman presenting a SendFlow phone",
    imageKey: "about-hero-woman",
  },
  {
    slug: "about-hero-slide-02",
    kind: ABOUT_CAROUSEL_KIND,
    orderIndex: 2,
    titleFr: "Portrait illustratif d’une professionnelle présentant un téléphone",
    titleEn: "Illustrative portrait of a woman professional presenting a phone",
    imageKey: "sendflow-about-professional-01",
  },
  {
    slug: "about-hero-slide-03",
    kind: ABOUT_CAROUSEL_KIND,
    orderIndex: 3,
    titleFr: "Portrait illustratif d’un professionnel présentant un téléphone",
    titleEn: "Illustrative portrait of a man professional presenting a phone",
    imageKey: "sendflow-about-professional-02",
  },
  {
    slug: "about-hero-slide-04",
    kind: ABOUT_CAROUSEL_KIND,
    orderIndex: 4,
    titleFr: "Portrait illustratif d’une professionnelle de la finance",
    titleEn: "Illustrative portrait of a woman finance professional",
    imageKey: "sendflow-about-professional-03",
  },
  {
    slug: "about-hero-slide-05",
    kind: ABOUT_CAROUSEL_KIND,
    orderIndex: 5,
    titleFr: "Portrait illustratif d’un professionnel de la technologie",
    titleEn: "Illustrative portrait of a man technology professional",
    imageKey: "sendflow-about-professional-04",
  },
  {
    slug: "about-hero-slide-06",
    kind: ABOUT_CAROUSEL_KIND,
    orderIndex: 6,
    titleFr: "Portrait illustratif d’une entrepreneuse présentant un téléphone",
    titleEn: "Illustrative portrait of a woman entrepreneur presenting a phone",
    imageKey: "sendflow-about-professional-05",
  },
] as const;

function resourceConfig(name: string) {
  return Object.prototype.hasOwnProperty.call(resources, name)
    ? resources[name as ResourceName]
    : undefined;
}

function editablePayload(name: ResourceName, body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const source = body as Record<string, unknown>;
  const allowed = resources[name].editable as readonly string[];
  if (Object.keys(source).some((key) => !allowed.includes(key))) return null;
  return Object.fromEntries(Object.entries(source).filter(([key, value]) => allowed.includes(key) && value !== undefined));
}

async function validateAboutCarouselSlide(
  values: Record<string, unknown>,
  current?: { kind?: string; imageKey?: string | null; titleFr?: string; titleEn?: string },
): Promise<string | null> {
  const currentIsCarouselSlide = current?.kind === ABOUT_CAROUSEL_KIND;
  const requestedKind = values.kind;
  if (currentIsCarouselSlide && requestedKind !== undefined && requestedKind !== ABOUT_CAROUSEL_KIND) {
    return "Le type d’un portrait du carrousel ne peut pas être modifié.";
  }
  if (!currentIsCarouselSlide && requestedKind !== ABOUT_CAROUSEL_KIND) return null;

  const imageKey = typeof values.imageKey === "string" ? values.imageKey.trim() : current?.imageKey?.trim();
  const titleFr = typeof values.titleFr === "string" ? values.titleFr.trim() : current?.titleFr?.trim();
  const titleEn = typeof values.titleEn === "string" ? values.titleEn.trim() : current?.titleEn?.trim();
  if (!titleFr || !titleEn) return "Le texte alternatif du portrait est requis en français et en anglais.";
  if (!imageKey) return "Choisissez une image valide pour ce portrait.";
  if (ABOUT_CAROUSEL_IMAGE_KEYS.has(imageKey)) return null;

  const [visibleImage] = await db.select({ slug: landingMedia.slug, mimeType: landingMedia.mimeType })
    .from(landingMedia)
    .where(and(eq(landingMedia.slug, imageKey), eq(landingMedia.isVisible, true)))
    .limit(1);
  return visibleImage?.mimeType.startsWith("image/")
    ? null
    : "L’image sélectionnée n’existe pas dans la médiathèque ou n’est pas visible.";
}

async function hasVisibleCarouselReference(mediaSlug: string): Promise<boolean> {
  const [reference] = await db.select({ id: landingSections.id })
    .from(landingSections)
    .where(and(
      eq(landingSections.kind, ABOUT_CAROUSEL_KIND),
      eq(landingSections.imageKey, mediaSlug),
      eq(landingSections.isVisible, true),
    ))
    .limit(1);
  return Boolean(reference);
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

function newsletterPayload(body: unknown): { subject: string; previewText: string | null; bodyHtml: string } | null {
  const parsed = newsletterCampaignSchema.safeParse(body);
  if (!parsed.success) return null;
  return {
    subject: parsed.data.subject,
    previewText: parsed.data.previewText || null,
    bodyHtml: parsed.data.bodyHtml,
  };
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

function configuredPublicOrigin(): string {
  const configuredSite = getPublicSiteUrl()?.replace(/\/+$/, "");
  if (!configuredSite) {
    throw new Error("PUBLIC_SITE_URL doit être configurée avant l’envoi d’une campagne.");
  }
  let parsed: URL;
  try {
    parsed = new URL(configuredSite);
  } catch {
    throw new Error("PUBLIC_SITE_URL doit être une URL publique valide.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("PUBLIC_SITE_URL doit utiliser http:// ou https:// sans identifiants ni paramètres.");
  }
  return parsed.origin;
}

function publicSiteAssetUrl(origin: string, assetName: string): string {
  const configuredSite = getPublicSiteUrl()?.replace(/\/+$/, "");
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

router.post("/newsletter/subscribe", newsletterSubscribeRateLimit, async (req, res): Promise<void> => {
  const parsed = newsletterSubscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Saisis une adresse email valide." });
    return;
  }
  const email = parsed.data.email;
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

function parseNewsletterUnsubscribeToken(value: unknown): string | null {
  const token = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)
    ? token
    : null;
}

router.get("/newsletter/unsubscribe/:token", async (req, res): Promise<void> => {
  const token = parseNewsletterUnsubscribeToken(req.params.token);
  if (!token) {
    res.status(400).type("html").send("<h1>Lien de désabonnement invalide.</h1>");
    return;
  }
  const [subscriber] = await db.select({ id: newsletterSubscribers.id })
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.unsubscribeToken, token))
    .limit(1);
  if (!subscriber) {
    res.status(404).type("html").send("<h1>Lien de désabonnement invalide ou déjà expiré.</h1>");
    return;
  }
  res
    .set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    })
    .type("html")
    .send(`<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Confirmer le désabonnement · SendFlow</title></head>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:80px auto;padding:24px;color:#192231">
  <h1>Confirmer le désabonnement</h1>
  <p>Confirmez votre choix pour ne plus recevoir les campagnes SendFlow.</p>
  <form method="post" action="/api/newsletter/unsubscribe/${encodeURIComponent(token)}">
    <button type="submit">Confirmer mon désabonnement</button>
  </form>
</body>
</html>`);
});

router.post("/newsletter/unsubscribe/:token", async (req, res): Promise<void> => {
  const token = parseNewsletterUnsubscribeToken(req.params.token);
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
  res
    .set({
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow",
    })
    .type("html")
    .send(`<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Désabonnement confirmé · SendFlow</title></head>
<body style="font-family:Arial,sans-serif;max-width:560px;margin:80px auto;padding:24px;color:#192231">
  <h1>Désabonnement confirmé</h1>
  <p>Cette adresse ne recevra plus les campagnes SendFlow.</p>
</body>
</html>`);
});

router.get("/admin/newsletter", requireAdmin, async (_req, res): Promise<void> => {
  res.json(await getNewsletterAdminBundle());
});

router.patch("/admin/newsletter/subscribers/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parsePositivePathId(req.params.id);
  const parsed = newsletterSubscriberStatusSchema.safeParse(req.body);
  if (!id || !parsed.success) {
    res.status(400).json({ error: "Statut d’abonné invalide." });
    return;
  }
  const status = parsed.data.status;
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
  const id = parsePositivePathId(req.params.id);
  if (!id) {
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
  if (!payload) {
    res.status(400).json({ error: "Les champs de campagne sont invalides ou dépassent les limites autorisées." });
    return;
  }
  const [created] = await db.insert(newsletterCampaigns).values(payload).returning();
  res.status(201).json(created);
});

router.patch("/admin/newsletter/campaigns/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parsePositivePathId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Identifiant de campagne invalide." });
    return;
  }
  const [existing] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Campagne introuvable." });
    return;
  }
  if (existing.status !== "draft") {
    res.status(409).json({ error: "Seul un brouillon peut être modifié. Après un échec, vérifiez les envois avant de créer une nouvelle campagne." });
    return;
  }
  const payload = newsletterPayload(req.body);
  if (!payload) {
    res.status(400).json({ error: "Les champs de campagne sont invalides ou dépassent les limites autorisées." });
    return;
  }
  const [updated] = await db.update(newsletterCampaigns).set({
    ...payload,
    status: "draft",
    lastError: null,
    updatedAt: new Date(),
  }).where(and(eq(newsletterCampaigns.id, id), eq(newsletterCampaigns.status, "draft"))).returning();
  if (!updated) {
    res.status(409).json({ error: "La campagne a changé d’état. Rechargez la liste avant de réessayer." });
    return;
  }
  res.json(updated);
});

router.delete("/admin/newsletter/campaigns/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parsePositivePathId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Identifiant de campagne invalide." });
    return;
  }
  const [existing] = await db.select({ id: newsletterCampaigns.id, status: newsletterCampaigns.status }).from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Campagne introuvable." });
    return;
  }
  if (existing.status !== "draft") {
    res.status(409).json({ error: "Seul un brouillon peut être supprimé." });
    return;
  }
  const [deleted] = await db.delete(newsletterCampaigns)
    .where(and(eq(newsletterCampaigns.id, id), eq(newsletterCampaigns.status, "draft")))
    .returning({ id: newsletterCampaigns.id });
  if (!deleted) {
    res.status(409).json({ error: "La campagne a changé d’état et n’a pas été supprimée." });
    return;
  }
  res.sendStatus(204);
});

router.post("/admin/newsletter/campaigns/:id/send", requireAdmin, async (req, res): Promise<void> => {
  const id = parsePositivePathId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Identifiant de campagne invalide." });
    return;
  }
  const [campaign] = await db.select().from(newsletterCampaigns).where(eq(newsletterCampaigns.id, id)).limit(1);
  if (!campaign) {
    res.status(404).json({ error: "Campagne introuvable." });
    return;
  }
  if (campaign.status !== "draft") {
    res.status(409).json({ error: "Seul un brouillon peut être envoyé. Après un échec, vérifiez dans Resend si des messages sont déjà partis avant de créer une nouvelle campagne." });
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

  const [claimed] = await db.update(newsletterCampaigns).set({
    status: "sending",
    recipientCount: subscribers.length,
    sentCount: 0,
    failedCount: 0,
    lastError: null,
    updatedAt: new Date(),
  }).where(and(eq(newsletterCampaigns.id, id), eq(newsletterCampaigns.status, "draft"))).returning({
    id: newsletterCampaigns.id,
  });
  if (!claimed) {
    res.status(409).json({ error: "Cette campagne a déjà été prise en charge. Rechargez la liste avant toute nouvelle action." });
    return;
  }

  let sentCount = 0;
  try {
    const from = process.env.RESEND_FROM_EMAIL?.trim();
    if (!from) throw new Error("RESEND_FROM_EMAIL doit être configurée avec une adresse vérifiée dans Resend.");
    const origin = configuredPublicOrigin();
    const logoUrl = publicSiteAssetUrl(origin, "sendflow-wordmark.png");
    const batches = [];
    for (let index = 0; index < subscribers.length; index += 100) batches.push(subscribers.slice(index, index + 100));
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
      sentCount,
      failedCount: Math.max(subscribers.length - sentCount, 0),
      lastError: message.slice(0, 1000),
      updatedAt: new Date(),
    }).where(eq(newsletterCampaigns.id, id)).returning();
    res.status(502).json({
      error: `L’envoi a échoué. Certains messages ont peut-être déjà été distribués. Ne relancez pas cette campagne; vérifiez les envois dans Resend avant d’en créer une nouvelle. (${message})`,
      campaign: failed,
    });
  }
});

router.get("/landing", async (_req, res): Promise<void> => {
  res.json(filterPublicLandingBundle(await getLandingBundle()));
});

router.get("/admin/landing", requireAdmin, async (_req, res): Promise<void> => {
  res.json(await getLandingBundle());
});

router.post("/admin/landing/about-carousel/initialize", requireAdmin, async (_req, res): Promise<void> => {
  const defaultSlugs = ABOUT_CAROUSEL_DEFAULTS.map((slide) => slide.slug);
  const existingRows = await db.select({ slug: landingSections.slug, kind: landingSections.kind })
    .from(landingSections)
    .where(inArray(landingSections.slug, defaultSlugs));
  const existingSlides = existingRows.filter((row) => row.kind === ABOUT_CAROUSEL_KIND);
  if (existingSlides.length > 0) {
    res.json({ created: false, slideCount: existingSlides.length });
    return;
  }

  const conflictingSlugs = existingRows.filter((row) => row.kind !== ABOUT_CAROUSEL_KIND);
  if (conflictingSlugs.length > 0) {
    res.status(409).json({ error: "Un identifiant du carrousel est déjà utilisé par une autre section." });
    return;
  }

  await db.insert(landingSections)
    .values(ABOUT_CAROUSEL_DEFAULTS.map((slide) => ({ ...slide, isVisible: true })))
    .onConflictDoNothing({ target: landingSections.slug });
  const initializedSlides = await db.select({ id: landingSections.id })
    .from(landingSections)
    .where(eq(landingSections.kind, ABOUT_CAROUSEL_KIND));
  res.status(201).json({ created: true, slideCount: initializedSlides.length });
});

router.put("/admin/landing/founder", requireAdmin, async (req, res): Promise<void> => {
  const parsed = founderProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Les champs du profil fondateur sont invalides." });
    return;
  }
  const values = trimContactFields(parsed.data as Record<string, unknown>, founderContactFields);
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
  const parsed = siteSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Les paramètres du site sont invalides." });
    return;
  }
  const values = trimContactFields(parsed.data as Record<string, unknown>, [...siteContactFields, ...siteLinkFields]);
  try {
    normalizePublicLinks(values, siteLinkFields, ["apkUrl"]);
    const emailLabels: Record<string, string> = {
      supportEmail: "L’email du support",
      legalEmail: "L’email légal",
      homeContactEmail: "L’email de contact de l’accueil",
      featuresContactEmail: "L’email de contact des fonctionnalités",
      securityContactEmail: "L’email de contact de la sécurité",
      downloadContactEmail: "L’email de contact du téléchargement",
      aboutContactEmail: "L’email de contact de la page à propos",
      legalContactEmail: "L’email de contact légal",
    };
    for (const fieldName of siteEmailFields) {
      normalizeOptionalEmail(values, fieldName, emailLabels[fieldName]);
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

router.post("/admin/landing/media/upload", requireAdmin, mediaUploadRateLimit, mediaUploadBody, async (req, res): Promise<void> => {
  const contentType = (req.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const headers = mediaUploadHeadersSchema.safeParse({
    name: req.get("x-file-name"),
    mimeType: contentType,
  });
  const image = Buffer.isBuffer(req.body) ? req.body : null;
  if (!headers.success || !image || image.length === 0 || image.length > 10 * 1024 * 1024) {
    res.status(400).json({ error: "Un fichier image valide de 10 Mo maximum est requis." });
    return;
  }
  if (!imageBytesMatchMimeType(headers.data.mimeType, image)) {
    res.status(400).json({ error: "Le contenu du fichier ne correspond pas à son type d’image déclaré." });
    return;
  }

  try {
    const publicRoot = getPublicObjectSearchPaths()[0];
    const { bucketName, objectName: publicObjectRoot } = parseStoragePath(publicRoot);
    const extension = headers.data.mimeType === "image/jpeg" ? "jpg" : headers.data.mimeType.slice("image/".length);
    const relativePath = `landing/admin/${randomUUID()}.${extension}`;
    const objectName = `${publicObjectRoot.replace(/\/+$/, "")}/${relativePath}`;
    if (isPleskMediaStorageEnabled()) {
      await storePleskPublicObject({ bucketName, objectName, contents: image });
    } else {
      const uploadUrl = await getSignedObjectUrl({ bucketName, objectName, method: "PUT" });
      const uploaded = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": headers.data.mimeType },
        body: image,
        signal: AbortSignal.timeout(30_000),
      });
      if (!uploaded.ok) {
        req.log.warn({ statusCode: uploaded.status }, "Admin media upload failed in object storage");
        res.status(503).json({ error: "Le stockage des images n’a pas accepté le fichier." });
        return;
      }
    }
    res.status(201).json({
      kind: "image",
      sourcePath: headers.data.name,
      mimeType: headers.data.mimeType,
      storagePath: `${publicRoot.replace(/\/+$/, "")}/${relativePath}`,
      publicUrl: `/api/storage/public-objects/${relativePath}`,
    });
  } catch {
    req.log.warn("Unable to complete admin media upload");
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
  const id = parsePositivePathId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid resource id" });
    return;
  }
  const editable = editablePayload(name as ResourceName, req.body);
  const values = editable && parseLandingResourcePayload(name, editable, "patch");
  if (!values) {
    res.status(400).json({ error: "No editable fields supplied" });
    return;
  }
  const [currentSection] = name === "sections"
    ? await db.select().from(landingSections).where(eq(landingSections.id, id)).limit(1)
    : [];
  const [currentMedia] = name === "media"
    ? await db.select().from(landingMedia).where(eq(landingMedia.id, id)).limit(1)
    : [];
  if ((name === "sections" && !currentSection) || (name === "media" && !currentMedia)) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  if (name === "sections") {
    const carouselError = await validateAboutCarouselSlide(values, currentSection);
    if (carouselError) {
      res.status(400).json({ error: carouselError });
      return;
    }
  }
  if (
    name === "media" &&
    values.isVisible === false &&
    currentMedia &&
    await hasVisibleCarouselReference(currentMedia.slug)
  ) {
    res.status(409).json({ error: "Cette image est utilisée par un portrait visible. Modifiez ou masquez d’abord le portrait." });
    return;
  }
  const table = config.table as any;
  let updated: any;
  let lastVisibleSlideBlocked = false;
  if (
    name === "sections" &&
    currentSection?.kind === ABOUT_CAROUSEL_KIND &&
    currentSection.isVisible &&
    values.isVisible === false
  ) {
    await db.transaction(async (tx) => {
      const visibleSlides = await tx.select({ id: landingSections.id })
        .from(landingSections)
        .where(and(
          eq(landingSections.kind, ABOUT_CAROUSEL_KIND),
          eq(landingSections.isVisible, true),
        ))
        .for("update");
      if (visibleSlides.length <= 1 && visibleSlides.some((slide) => slide.id === id)) {
        lastVisibleSlideBlocked = true;
        return;
      }
      [updated] = await tx.update(landingSections).set(values).where(eq(landingSections.id, id)).returning();
    });
  } else {
    [updated] = await db.update(table).set(values).where(eq(table.id, id)).returning();
  }
  if (lastVisibleSlideBlocked) {
    res.status(409).json({ error: "Le dernier portrait visible ne peut pas être masqué." });
    return;
  }
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
  const editable = editablePayload(name as ResourceName, req.body);
  const values = editable && parseLandingResourcePayload(name, editable, "create");
  if (!values) {
    res.status(400).json({ error: "No editable fields supplied" });
    return;
  }
  if (name === "sections") {
    const carouselError = await validateAboutCarouselSlide(values);
    if (carouselError) {
      res.status(400).json({ error: carouselError });
      return;
    }
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
  const id = parsePositivePathId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid resource id" });
    return;
  }
  const [currentSection] = name === "sections"
    ? await db.select().from(landingSections).where(eq(landingSections.id, id)).limit(1)
    : [];
  const [currentMedia] = name === "media"
    ? await db.select().from(landingMedia).where(eq(landingMedia.id, id)).limit(1)
    : [];
  if ((name === "sections" && !currentSection) || (name === "media" && !currentMedia)) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  if (name === "media" && currentMedia && await hasVisibleCarouselReference(currentMedia.slug)) {
    res.status(409).json({ error: "Cette image est utilisée par un portrait visible. Modifiez ou masquez d’abord le portrait." });
    return;
  }
  const table = config.table as any;
  let deleted: any;
  let lastVisibleSlideBlocked = false;
  if (name === "sections" && currentSection?.kind === ABOUT_CAROUSEL_KIND && currentSection.isVisible) {
    await db.transaction(async (tx) => {
      const visibleSlides = await tx.select({ id: landingSections.id })
        .from(landingSections)
        .where(and(
          eq(landingSections.kind, ABOUT_CAROUSEL_KIND),
          eq(landingSections.isVisible, true),
        ))
        .for("update");
      if (visibleSlides.length <= 1 && visibleSlides.some((slide) => slide.id === id)) {
        lastVisibleSlideBlocked = true;
        return;
      }
      const deletedRows = await tx.delete(landingSections).where(eq(landingSections.id, id)).returning();
      deleted = deletedRows[0];
    });
  } else {
    const deletedRows = (await db.delete(table).where(eq(table.id, id)).returning()) as any[];
    deleted = deletedRows[0];
  }
  if (lastVisibleSlideBlocked) {
    res.status(409).json({ error: "Le dernier portrait visible ne peut pas être supprimé." });
    return;
  }
  if (!deleted) {
    res.status(404).json({ error: "Resource not found" });
    return;
  }
  res.sendStatus(204);
});

router.put("/admin/landing/countries/:countryId/operators", requireAdmin, async (req, res): Promise<void> => {
  const countryId = parsePositivePathId(req.params.countryId);
  const parsed = countryOperatorAssignmentSchema.safeParse(req.body);
  if (!countryId || !parsed.success) {
    res.status(400).json({ error: "Invalid country id" });
    return;
  }
  const operatorIds = parsed.data.operatorIds;
  const [country] = await db.select({ id: landingCountries.id }).from(landingCountries)
    .where(eq(landingCountries.id, countryId)).limit(1);
  if (!country) {
    res.status(404).json({ error: "Country not found" });
    return;
  }
  if (operatorIds.length) {
    const existingOperators = await db.select({ id: landingOperators.id }).from(landingOperators)
      .where(inArray(landingOperators.id, operatorIds));
    if (existingOperators.length !== operatorIds.length) {
      res.status(400).json({ error: "One or more operators do not exist" });
      return;
    }
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
