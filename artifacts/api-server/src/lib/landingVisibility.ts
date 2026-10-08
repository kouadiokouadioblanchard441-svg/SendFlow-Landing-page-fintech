type VisibleRow = { isVisible?: unknown };

export type LandingVisibilityBundle = {
  media: Array<VisibleRow>;
  content: Array<VisibleRow>;
  sections: Array<VisibleRow>;
  features: Array<VisibleRow>;
  faqs: Array<VisibleRow>;
  countries: Array<VisibleRow & { id: number }>;
  operators: Array<VisibleRow & { id: number }>;
  countryOperators: Array<{ countryId: number; operatorId: number }>;
  globeBadges: Array<VisibleRow & { operatorId: number }>;
  legalPages: Array<VisibleRow & { id: number }>;
  legalSections: Array<{ pageId: number }>;
  founder: (VisibleRow & Record<string, unknown>) | null;
  settings: unknown;
};

function visibleRows<T extends VisibleRow>(rows: T[]): T[] {
  return rows.filter((row) => row.isVisible === true);
}

export function filterPublicLandingBundle<T extends LandingVisibilityBundle>(bundle: T): T {
  const media = visibleRows(bundle.media);
  const content = visibleRows(bundle.content);
  const sections = visibleRows(bundle.sections);
  const features = visibleRows(bundle.features);
  const faqs = visibleRows(bundle.faqs);
  const countries = visibleRows(bundle.countries);
  const operators = visibleRows(bundle.operators);
  const legalPages = visibleRows(bundle.legalPages);
  const countryIds = new Set(countries.map((country) => country.id));
  const operatorIds = new Set(operators.map((operator) => operator.id));
  const legalPageIds = new Set(legalPages.map((page) => page.id));

  return {
    ...bundle,
    media,
    content,
    sections,
    features,
    faqs,
    countries,
    operators,
    countryOperators: bundle.countryOperators.filter(
      (relation) => countryIds.has(relation.countryId) && operatorIds.has(relation.operatorId),
    ),
    globeBadges: visibleRows(bundle.globeBadges).filter((badge) => operatorIds.has(badge.operatorId)),
    legalPages,
    legalSections: bundle.legalSections.filter((section) => legalPageIds.has(section.pageId)),
    founder: bundle.founder?.isVisible === true ? bundle.founder : null,
  };
}
