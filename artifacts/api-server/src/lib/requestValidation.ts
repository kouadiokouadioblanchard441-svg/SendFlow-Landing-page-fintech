import { z } from "zod";

const text = (maxLength: number) =>
  z.string().max(maxLength).refine((value) => !value.includes("\u0000"));
const meaningfulText = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength).refine((value) => !value.includes("\u0000"));
const nonEmptyKey = (maxLength: number) =>
  z.string().trim().min(1).max(maxLength).regex(/^[a-z0-9][a-z0-9._-]*$/i);
const orderIndex = z.number().int().min(0).max(1_000_000);
const positiveId = z.number().int().min(1).max(2_147_483_647);
const visibility = z.boolean().optional();
const nullableText = (maxLength: number) => text(maxLength).nullable().optional();

function isHttpUrl(value: string, allowRelative = false): boolean {
  if (!value) return true;
  if (allowRelative && /^\/(?!\/)/.test(value)) {
    const path = value.split(/[?#]/, 1)[0];
    return !/[\u0000-\u0020\\]/.test(value) &&
      !/(^|\/)(?:\.{1,2}|%2e%2e)(?=\/|$)/i.test(path);
  }
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username && !url.password;
  } catch {
    return false;
  }
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

const optionalHttpUrl = (allowRelative = false) =>
  text(2_048).nullable().optional().refine((value) =>
    value === null || value === undefined || isHttpUrl(value, allowRelative),
  );
const optionalEmail = (required = false) => {
  const email = text(320).refine((value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
  return required ? email : email.nullable().optional();
};

export const newsletterSubscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  consent: z.literal(true),
}).strict();

export const newsletterSubscriberStatusSchema = z.object({
  status: z.enum(["subscribed", "unsubscribed"]),
}).strict();

export const newsletterCampaignSchema = z.object({
  subject: z.string().trim().min(1).max(180),
  previewText: z.string().trim().max(240).nullable().optional(),
  bodyHtml: z.string().trim().min(1).max(500_000),
}).strict();

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(1_024),
  panelToken: z.string().trim().min(1).max(256).refine((value) => !/[\u0000-\u001f\u007f]/.test(value)),
  panelEmail: z.string().trim().toLowerCase().email().max(320),
}).strict();

export const panelLookupSchema = z.object({
  token: z.string().trim().min(1).max(256).refine((value) => !/[\u0000-\u001f\u007f]/.test(value)),
  email: z.string().trim().toLowerCase().email().max(320),
}).strict();

export const countryOperatorAssignmentSchema = z.object({
  operatorIds: z.array(positiveId).max(100).refine((ids) => new Set(ids).size === ids.length),
}).strict();

export const mediaUploadHeadersSchema = z.object({
  name: z.string().trim().min(1).max(255).refine((value) => !/[\/\\\u0000-\u001f\u007f]/.test(value)),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
}).strict();

export function imageBytesMatchMimeType(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === "image/png") {
    return bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

function hasUnsafePathSegments(value: string): boolean {
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return true;
  }
  return decoded.includes("\\") ||
    /[\u0000-\u0020\u007f]/.test(decoded) ||
    decoded.replace(/^\/+/, "").split("/").some((segment) =>
      !segment || segment === "." || segment === "..",
    );
}

const safeStoragePath = text(2_048).refine((value) =>
  !value.startsWith("//") &&
  !/[?#]/.test(value) &&
  !hasUnsafePathSegments(value),
);
const publicMediaUrl = text(2_048).refine((value) =>
  value.startsWith("/api/storage/public-objects/") &&
  !/[?#]/.test(value) &&
  !hasUnsafePathSegments(value),
);
const nullableHexColor = z.string()
  .regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
  .nullable()
  .optional();
const dimension = z.number().int().min(1).max(20_000).nullable().optional();
const positionPercent = z.number().int().min(0).max(100).nullable().optional();

const landingContentSchema = z.object({
  contentKey: nonEmptyKey(160),
  locale: z.enum(["fr", "en"]),
  group: z.string().trim().min(1).max(48),
  contentType: z.enum(["text", "html", "url"]),
  value: text(20_000),
  orderIndex: orderIndex.optional(),
  isVisible: visibility,
}).strict();

export function isSafeRegistrationCtaContent(item: Record<string, unknown>): boolean {
  if (item.contentKey === "cta.signup.url") {
    return item.locale === "fr" &&
      item.contentType === "url" &&
      (item.isVisible === false ||
        (typeof item.value === "string" && item.value.length <= 2_048 && isHttpsUrl(item.value)));
  }
  if (item.contentKey === "cta.signup.label") {
    return item.contentType === "text" &&
      typeof item.value === "string" &&
      item.value.trim().length > 0 &&
      item.value.length <= 120;
  }
  return true;
}

export const landingResourceSchemas = {
  content: landingContentSchema,
  media: z.object({
    slug: nonEmptyKey(160),
    kind: nonEmptyKey(32),
    sourcePath: z.string().trim().min(1).max(255).refine((value) => !/[\/\\\u0000-\u001f\u007f]/.test(value)),
    storagePath: safeStoragePath,
    publicUrl: publicMediaUrl,
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    altFr: nullableText(2_000),
    altEn: nullableText(2_000),
    width: dimension,
    height: dimension,
    isVisible: visibility,
  }).strict(),
  sections: z.object({
    slug: nonEmptyKey(80),
    kind: nonEmptyKey(40),
    orderIndex,
    eyebrowFr: nullableText(2_000),
    eyebrowEn: nullableText(2_000),
    titleFr: text(5_000),
    titleEn: text(5_000),
    bodyFr: nullableText(20_000),
    bodyEn: nullableText(20_000),
    imageKey: nullableText(160),
    isVisible: visibility,
  }).strict(),
  features: z.object({
    slug: nonEmptyKey(80),
    group: z.string().trim().min(1).max(40),
    orderIndex,
    titleFr: text(5_000),
    titleEn: text(5_000),
    bodyFr: text(20_000),
    bodyEn: text(20_000),
    iconKey: nullableText(160),
    imageKey: nullableText(160),
    isVisible: visibility,
  }).strict(),
  faqs: z.object({
    orderIndex,
    questionFr: text(5_000),
    questionEn: text(5_000),
    answerFr: text(20_000),
    answerEn: text(20_000),
    isVisible: visibility,
  }).strict(),
  countries: z.object({
    code: z.string().trim().toUpperCase().length(2).regex(/^[A-Z]{2}$/),
    nameFr: z.string().max(100),
    nameEn: z.string().max(100),
    flag: z.string().max(16),
    tone: z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i),
    orderIndex,
    heroPositionX: positionPercent,
    heroPositionY: positionPercent,
    isVisible: visibility,
  }).strict(),
  operators: z.object({
    slug: nonEmptyKey(80),
    name: z.string().trim().min(1).max(100),
    logoKey: nullableText(160),
    background: nullableHexColor,
    foreground: nullableHexColor,
    isVisible: visibility,
  }).strict(),
  badges: z.object({
    operatorId: positiveId,
    positionX: z.number().int().min(0).max(100),
    positionY: z.number().int().min(0).max(100),
    orderIndex,
    isVisible: visibility,
  }).strict(),
  legalPages: z.object({
    slug: nonEmptyKey(80),
    titleFr: text(5_000),
    titleEn: text(5_000),
    introFr: text(20_000),
    introEn: text(20_000),
    isVisible: visibility,
  }).strict(),
  legalSections: z.object({
    pageId: positiveId,
    sectionNumber: positiveId,
    titleFr: text(5_000),
    titleEn: text(5_000),
    bodyFr: text(50_000),
    bodyEn: text(50_000),
    orderIndex,
  }).strict(),
} as const;

const requiredResourceFields = {
  content: ["contentKey", "locale", "group", "value"],
  media: ["slug", "kind", "sourcePath", "storagePath", "publicUrl", "mimeType"],
  sections: ["slug", "kind", "orderIndex", "titleFr", "titleEn"],
  features: ["slug", "group", "orderIndex", "titleFr", "titleEn", "bodyFr", "bodyEn"],
  faqs: ["orderIndex", "questionFr", "questionEn", "answerFr", "answerEn"],
  countries: ["code", "nameFr", "nameEn", "flag", "tone", "orderIndex"],
  operators: ["slug", "name"],
  badges: ["operatorId", "positionX", "positionY", "orderIndex"],
  legalPages: ["slug", "titleFr", "titleEn", "introFr", "introEn"],
  legalSections: ["pageId", "sectionNumber", "titleFr", "titleEn", "bodyFr", "bodyEn", "orderIndex"],
} as const;

export type LandingResourceName = keyof typeof landingResourceSchemas;

export function parseLandingResourcePayload(
  name: string,
  input: unknown,
  mode: "create" | "patch",
): Record<string, unknown> | null {
  if (!Object.prototype.hasOwnProperty.call(landingResourceSchemas, name)) return null;
  const resource = name as LandingResourceName;
  const schema = landingResourceSchemas[resource];
  const result = (mode === "patch" ? schema.partial().strict() : schema).safeParse(input);
  if (!result.success || Object.keys(result.data).length === 0) return null;
  if (mode === "create" && !requiredResourceFields[resource].every((key) =>
    Object.prototype.hasOwnProperty.call(result.data, key),
  )) return null;
  return result.data as Record<string, unknown>;
}

const founderContactFields = {
  name: meaningfulText(500),
  roleFr: meaningfulText(2_000),
  roleEn: meaningfulText(2_000),
  shortBioFr: meaningfulText(10_000),
  shortBioEn: meaningfulText(10_000),
  storyFr: meaningfulText(20_000),
  storyEn: meaningfulText(20_000),
  visionFr: meaningfulText(20_000),
  visionEn: meaningfulText(20_000),
  educationFr: meaningfulText(20_000),
  educationEn: meaningfulText(20_000),
  missionFr: meaningfulText(20_000),
  missionEn: meaningfulText(20_000),
  photoKey: nullableText(160),
  linkedinUrl: optionalHttpUrl(),
  websiteUrl: optionalHttpUrl(),
  instagramUrl: optionalHttpUrl(),
  xUrl: optionalHttpUrl(),
  email: optionalEmail(),
  isVisible: z.boolean(),
};

export const founderProfileSchema = z.object(founderContactFields).strict();

const settingsRequiredTextFields = [
  "companyName", "legalForm", "legalAddress", "footerAddressFlag", "footerAddressCountry",
  "footerAddress", "regulatorNameFr", "regulatorNameEn",
] as const;
const settingsOptionalTextFields = [
  "supportPhone", "homeContactPhone", "homeContactWhatsapp", "featuresContactPhone",
  "featuresContactWhatsapp", "securityContactPhone", "securityContactWhatsapp",
  "downloadContactPhone", "downloadContactWhatsapp", "aboutContactPhone", "aboutContactWhatsapp",
  "legalContactPhone", "legalContactWhatsapp",
] as const;
const settingsEmailFields = [
  "supportEmail", "legalEmail", "homeContactEmail", "featuresContactEmail", "securityContactEmail",
  "downloadContactEmail", "aboutContactEmail", "legalContactEmail",
] as const;
const settingsUrlFields = [
  "websiteUrl", "linkedinUrl", "instagramUrl", "facebookUrl", "whatsappUrl",
  "googlePlayUrl", "appStoreUrl",
] as const;
const settingsOptionalUrlFields = ["apkUrl"] as const;
const settingsMediaFields = ["regulatorLogoKey"] as const;

const settingsShape = Object.create(null) as Record<string, z.ZodTypeAny>;
for (const field of settingsRequiredTextFields) settingsShape[field] = text(2_000);
for (const field of settingsOptionalTextFields) settingsShape[field] = nullableText(500);
for (const field of settingsEmailFields) settingsShape[field] = optionalEmail(field === "supportEmail" || field === "legalEmail");
for (const field of settingsUrlFields) settingsShape[field] = optionalHttpUrl();
for (const field of settingsOptionalUrlFields) settingsShape[field] = optionalHttpUrl(true);
for (const field of settingsMediaFields) settingsShape[field] = nullableText(160);
export const registrationCtaSchema = z.object({
  url: z.string().trim().max(2_048).refine((value) => !value || isHttpsUrl(value)),
  labelFr: meaningfulText(120),
  labelEn: meaningfulText(120),
}).strict();
export const siteSettingsSchema = z.object(settingsShape).strict().extend({
  registrationUrl: registrationCtaSchema.shape.url,
  registrationLabelFr: registrationCtaSchema.shape.labelFr,
  registrationLabelEn: registrationCtaSchema.shape.labelEn,
});

export function parsePositivePathId(value: unknown): number | null {
  if (typeof value !== "string" || !/^[1-9]\d{0,9}$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= 2_147_483_647 ? parsed : null;
}
