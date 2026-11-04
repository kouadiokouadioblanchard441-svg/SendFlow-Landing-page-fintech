type VisibleRow = { isVisible?: unknown; [key: string]: unknown };
type PublicRow = Record<string, unknown>;

const DEFAULT_HOME_CONTACT_WHATSAPP = "+2250758427823";
const DEFAULT_WHATSAPP_CHANNEL_URL =
  "https://whatsapp.com/channel/0029VbDYGGEHwXb3jv0Oyg2T";

export type LandingVisibilityBundle = {
  media: Array<VisibleRow>;
  content: Array<VisibleRow>;
  sections: Array<VisibleRow>;
  features: Array<VisibleRow>;
  faqs: Array<VisibleRow>;
  countries: Array<VisibleRow & { id: number }>;
  operators: Array<VisibleRow & { id: number }>;
  countryOperators: Array<{ countryId: number; operatorId: number; orderIndex: number }>;
  globeBadges: Array<VisibleRow & { operatorId: number }>;
  legalPages: Array<VisibleRow & { id: number }>;
  legalSections: Array<{ pageId: number }>;
  founder: (VisibleRow & Record<string, unknown>) | null;
  settings: Record<string, unknown> | null;
};

export type PublicLandingBundle = {
  media: PublicRow[];
  content: PublicRow[];
  sections: PublicRow[];
  features: PublicRow[];
  faqs: PublicRow[];
  countries: PublicRow[];
  operators: PublicRow[];
  countryOperators: Array<{ countryId: number; operatorId: number; orderIndex: number }>;
  globeBadges: PublicRow[];
  legalPages: PublicRow[];
  legalSections: PublicRow[];
  founder: PublicRow | null;
  settings: PublicRow | null;
};

const publicFields = {
  media: ["id", "slug", "kind", "sourcePath", "storagePath", "publicUrl", "mimeType", "altFr", "altEn", "width", "height", "isVisible"],
  content: ["id", "contentKey", "locale", "group", "contentType", "value", "orderIndex", "isVisible"],
  sections: ["id", "slug", "kind", "orderIndex", "eyebrowFr", "eyebrowEn", "titleFr", "titleEn", "bodyFr", "bodyEn", "imageKey", "isVisible"],
  features: ["id", "slug", "group", "orderIndex", "titleFr", "titleEn", "bodyFr", "bodyEn", "iconKey", "imageKey", "isVisible"],
  faqs: ["id", "orderIndex", "questionFr", "questionEn", "answerFr", "answerEn", "isVisible"],
  countries: ["id", "code", "nameFr", "nameEn", "flag", "tone", "orderIndex", "heroPositionX", "heroPositionY", "isVisible"],
  operators: ["id", "slug", "name", "logoKey", "background", "foreground", "isVisible"],
  globeBadges: ["id", "operatorId", "positionX", "positionY", "orderIndex", "isVisible"],
  legalPages: ["id", "slug", "titleFr", "titleEn", "introFr", "introEn", "isVisible"],
  legalSections: ["id", "pageId", "sectionNumber", "titleFr", "titleEn", "bodyFr", "bodyEn", "orderIndex"],
  founder: [
    "id", "name", "roleFr", "roleEn", "shortBioFr", "shortBioEn", "storyFr", "storyEn",
    "visionFr", "visionEn", "educationFr", "educationEn", "missionFr", "missionEn",
    "photoKey", "linkedinUrl", "websiteUrl", "instagramUrl", "xUrl", "email", "isVisible",
  ],
  settings: [
    "id", "supportEmail", "supportPhone", "websiteUrl", "linkedinUrl", "instagramUrl", "facebookUrl",
    "whatsappUrl", "homeContactEmail", "homeContactPhone", "homeContactWhatsapp",
    "featuresContactEmail", "featuresContactPhone", "featuresContactWhatsapp",
    "securityContactEmail", "securityContactPhone", "securityContactWhatsapp",
    "downloadContactEmail", "downloadContactPhone", "downloadContactWhatsapp",
    "aboutContactEmail", "aboutContactPhone", "aboutContactWhatsapp",
    "legalContactEmail", "legalContactPhone", "legalContactWhatsapp", "companyName", "legalForm",
    "legalAddress", "legalEmail", "footerAddressFlag", "footerAddressCountry", "footerAddress",
    "regulatorNameFr", "regulatorNameEn", "regulatorLogoKey", "googlePlayUrl", "appStoreUrl", "apkUrl",
  ],
} as const;

function projectPublicFields(row: object, fields: readonly string[]): PublicRow {
  const source = row as PublicRow;
  return Object.fromEntries(fields
    .filter((field) => Object.prototype.hasOwnProperty.call(source, field))
    .map((field) => [field, source[field]]));
}

function visibleRows(rows: VisibleRow[], fields: readonly string[]): PublicRow[] {
  return rows
    .filter((row) => row.isVisible === true)
    .map((row) => projectPublicFields(row, fields));
}

function publicSettingsRow(settings: Record<string, unknown> | null): PublicRow {
  const publicSettings = settings
    ? projectPublicFields(settings, publicFields.settings)
    : {};

  // WhatsApp contact details are public configuration. Keep the configured
  // support number and channel URL available when existing database fields are
  // null, while allowing explicit blank values from the admin panel to disable
  // either link.
  if (typeof publicSettings.homeContactWhatsapp !== "string") {
    publicSettings.homeContactWhatsapp = DEFAULT_HOME_CONTACT_WHATSAPP;
  }
  if (typeof publicSettings.whatsappUrl !== "string") {
    publicSettings.whatsappUrl = DEFAULT_WHATSAPP_CHANNEL_URL;
  }

  return publicSettings;
}

export function filterPublicLandingBundle(bundle: LandingVisibilityBundle): PublicLandingBundle {
  const media = visibleRows(bundle.media, publicFields.media);
  const content = visibleRows(bundle.content, publicFields.content);
  const sections = visibleRows(bundle.sections, publicFields.sections);
  const features = visibleRows(bundle.features, publicFields.features);
  const faqs = visibleRows(bundle.faqs, publicFields.faqs);
  const countries = visibleRows(bundle.countries, publicFields.countries);
  const operators = visibleRows(bundle.operators, publicFields.operators);
  const legalPages = visibleRows(bundle.legalPages, publicFields.legalPages);
  const countryIds = new Set(countries.map((country) => country.id));
  const operatorIds = new Set(operators.map((operator) => operator.id));
  const legalPageIds = new Set(legalPages.map((page) => page.id));

  return {
    media,
    content,
    sections,
    features,
    faqs,
    countries,
    operators,
    countryOperators: bundle.countryOperators
      .filter(
      (relation) => countryIds.has(relation.countryId) && operatorIds.has(relation.operatorId),
      )
      .map(({ countryId, operatorId, orderIndex }) => ({ countryId, operatorId, orderIndex })),
    globeBadges: visibleRows(bundle.globeBadges, publicFields.globeBadges)
      .filter((badge) => operatorIds.has(badge.operatorId)),
    legalPages,
    legalSections: bundle.legalSections
      .filter((section) => legalPageIds.has(section.pageId))
      .map((section) => projectPublicFields(section, publicFields.legalSections)),
    founder: bundle.founder?.isVisible === true
      ? projectPublicFields(bundle.founder, publicFields.founder)
      : null,
    settings: publicSettingsRow(bundle.settings),
  };
}
