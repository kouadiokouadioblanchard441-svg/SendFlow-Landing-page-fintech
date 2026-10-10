export type LandingCountryView = {
  name: string;
  code: string;
  networks: string[];
  flag: string;
  tone: string;
  heroPositionX: number | null;
  heroPositionY: number | null;
};

type PublicCountryBundle = {
  countries: Array<{
    id: number;
    code: string;
    nameFr: string;
    nameEn: string;
    flag: string;
    tone: string;
    heroPositionX: number | null;
    heroPositionY: number | null;
    isVisible: boolean;
  }>;
  operators: Array<{ id: number; name: string; isVisible: boolean }>;
  countryOperators: Array<{ countryId: number; operatorId: number; orderIndex: number }>;
};

export function getActiveLandingCountries(
  bundle: PublicCountryBundle | undefined,
  language: 'fr' | 'en',
  fallbackCountries: LandingCountryView[],
): LandingCountryView[] {
  if (!bundle) return fallbackCountries;

  const visibleOperators = new Map(
    bundle.operators.filter((operator) => operator.isVisible).map((operator) => [operator.id, operator.name]),
  );

  return bundle.countries
    .filter((country) => country.isVisible)
    .map((country) => ({
      name: language === 'fr' ? country.nameFr : country.nameEn,
      code: country.code,
      flag: country.flag,
      tone: country.tone,
      heroPositionX: country.heroPositionX,
      heroPositionY: country.heroPositionY,
      networks: bundle.countryOperators
        .filter((relation) => relation.countryId === country.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((relation) => visibleOperators.get(relation.operatorId))
        .filter((name): name is string => Boolean(name)),
    }));
}
