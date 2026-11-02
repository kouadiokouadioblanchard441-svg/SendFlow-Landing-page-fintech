import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight, Globe2, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import DeveloperApiCard from '@/components/DeveloperApiCard';
import { ProtectedImage } from '@/components/protected-image';
import { SendFlowFooter, type FooterContentItem, type FooterSettings } from '@/components/sendflow-footer';
import { usePublicMobileMenu } from '@/hooks/use-public-mobile-menu';
import { developerApiExample } from '@/lib/developer-api-example';
import { getLocaleFromPath, getLocalizedPath } from '@/lib/localized-routes';
import { useSeo } from '@/lib/seo';
import publicSeoRoutes from '@/lib/public-seo-routes.json';
import sendflowMark from '@/assets/brand/sendflow-mark-original.png';
import sendflowWordmark from '@/assets/brand/sendflow-wordmark-original.png';

type Language = 'fr' | 'en';
type PublishedCountry = { code: string; nameFr: string; nameEn: string; isVisible: boolean };
type LandingResponse = {
  settings?: FooterSettings | null;
  content?: FooterContentItem[];
  countries?: PublishedCountry[];
};

const copy = {
  fr: {
    home: 'Accueil',
    features: 'Fonctionnalités',
    page: 'API développeur',
    menuOpen: 'Ouvrir le menu',
    menuClose: 'Fermer le menu',
    eyebrow: 'Espace développeur',
    title: 'API développeur SendFlow pour les paiements Mobile Money.',
    intro: 'Découvrez le point d’entrée de paiement SendFlow et consultez un exemple de requête publié, dans un format pensé pour une première lecture technique.',
    integration: 'Point d’entrée',
    method: 'Méthode HTTP',
    endpoint: 'Paiement entrant',
    contentType: 'Type de contenu',
    example: 'Exemple de requête',
    exampleIntro: 'Un aperçu concret des champs de requête publiés. Cette page ne décrit ni authentification ni format de réponse.',
    markets: 'Pays publiés sur SendFlow',
    marketsIntro: 'La liste ci-dessous reprend les pays visibles sur le site SendFlow. Leur présence ici ne confirme pas la disponibilité de chaque opération API.',
    noMarkets: 'Aucun pays n’est actuellement publié.',
    marketsUnavailable: 'Les pays publiés ne sont pas disponibles pour le moment.',
    marketsLoading: 'Chargement des pays publiés…',
    featuresLink: 'Voir les fonctionnalités',
    homeLink: 'Une plateforme, des réseaux connectés.',
    codeLabel: 'Requête JSON · Paiement entrant',
    detailsLabel: 'Détails publiés',
    detailMethod: 'Méthode',
    detailUrl: 'URL',
    detailFormat: 'Format de contenu',
    sectionTag: '01 / POINT D’ENTRÉE',
    codeTag: '02 / EXEMPLE',
    coverageTag: '03 / PRÉSENCE PUBLIQUE',
    ctaCopy: 'Découvrez comment SendFlow relie les personnes et les réseaux de paiement.',
  },
  en: {
    home: 'Home',
    features: 'Features',
    page: 'Developer API',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    eyebrow: 'Developer resources',
    title: 'SendFlow Developer API for Mobile Money payments.',
    intro: 'Explore the SendFlow payment entry point and review a published request example, presented for a clear first technical read.',
    integration: 'Entry point',
    method: 'HTTP method',
    endpoint: 'Pay-in',
    contentType: 'Content type',
    example: 'Request example',
    exampleIntro: 'A practical view of the published request fields. This page does not describe authentication or response formats.',
    markets: 'Countries published on SendFlow',
    marketsIntro: 'The list below reflects countries visible on the SendFlow website. Their presence here does not confirm availability for every API operation.',
    noMarkets: 'No countries are currently published.',
    marketsUnavailable: 'Published countries are unavailable right now.',
    marketsLoading: 'Loading published countries…',
    featuresLink: 'Explore features',
    homeLink: 'One platform. Connected networks.',
    codeLabel: 'JSON request · Pay-in',
    detailsLabel: 'Published details',
    detailMethod: 'Method',
    detailUrl: 'URL',
    detailFormat: 'Content type',
    sectionTag: '01 / ENTRY POINT',
    codeTag: '02 / EXAMPLE',
    coverageTag: '03 / PUBLIC PRESENCE',
    ctaCopy: 'See how SendFlow connects people and payment networks.',
  },
} as const;

function contentValue(content: FooterContentItem[], key: string, locale: Language, fallback: string) {
  return content.find((item) => item.contentKey === key && item.locale === locale && item.isVisible)?.value ?? fallback;
}

function Brand({ language }: { language: Language }) {
  return (
    <Link href={getLocalizedPath('/', language)} className="sf-features-brand" aria-label="SendFlow">
      <ProtectedImage src={sendflowMark} alt="" />
      <ProtectedImage src={sendflowWordmark} alt="SendFlow" />
    </Link>
  );
}

function NetworkSketch({ language }: { language: Language }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[430px]" aria-hidden="true">
      <div className="absolute inset-[8%] rounded-full border border-[#1769ff]/15" />
      <div className="absolute inset-[19%] rounded-full border border-dashed border-[#6d35d8]/20" />
      <div className="absolute inset-[31%] rounded-full border border-[#1769ff]/10" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 440 440" fill="none">
        <path d="M90 220C90 147.5 147.5 90 220 90s130 57.5 130 130-57.5 130-130 130" stroke="#1769ff" strokeOpacity=".3" strokeWidth="1.5" strokeDasharray="5 8" />
        <path d="M122 122l196 196M318 122 122 318" stroke="#6d35d8" strokeOpacity=".13" strokeWidth="1" />
        <circle cx="220" cy="90" r="5" fill="#1769ff" />
        <circle cx="350" cy="220" r="5" fill="#e8cd4d" />
        <circle cx="220" cy="350" r="5" fill="#6d35d8" />
        <circle cx="90" cy="220" r="5" fill="#9adacb" />
      </svg>
      <div className="absolute left-1/2 top-1/2 flex h-[35%] w-[35%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[#1769ff]/15 bg-white shadow-[0_20px_55px_rgba(25,45,80,.12)]">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f1edfb] sm:h-14 sm:w-14">
          <ProtectedImage src={sendflowMark} alt="" className="h-10 w-10 object-contain sm:h-12 sm:w-12" />
        </span>
        <span className="mt-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#1769ff] sm:text-xs">SendFlow</span>
      </div>
      <div className="absolute left-[1%] top-[42%] flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-[0_8px_24px_rgba(25,45,80,.08)] sm:left-0 sm:gap-3 sm:px-4 sm:py-3">
        <span className="h-2 w-2 rounded-full bg-[#9adacb]" />
        <span className="text-[10px] font-bold text-slate-700 sm:text-xs">{language === 'fr' ? 'Personnes' : 'People'}</span>
      </div>
      <div className="absolute right-[1%] top-[27%] flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 shadow-[0_8px_24px_rgba(25,45,80,.08)] sm:right-0 sm:gap-3 sm:px-4 sm:py-3">
        <span className="h-2 w-2 rounded-full bg-[#e8cd4d]" />
        <span className="text-[10px] font-bold text-slate-700 sm:text-xs">{language === 'fr' ? 'Réseaux' : 'Networks'}</span>
      </div>
      <div className="absolute bottom-[13%] right-[13%] rounded-full bg-[#1769ff] px-3 py-2 text-[9px] font-extrabold uppercase tracking-[.12em] text-white shadow-[0_10px_25px_rgba(23,105,255,.2)] sm:px-4 sm:py-2.5 sm:text-[10px]">
        {language === 'fr' ? 'Connecter' : 'Connect'}
      </div>
    </div>
  );
}

export default function DeveloperApiPage() {
  const [, navigate] = useLocation();
  const [language] = useState<Language>(() => getLocaleFromPath(window.location.pathname));
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState<FooterSettings | null>(null);
  const [content, setContent] = useState<FooterContentItem[]>([]);
  const [countries, setCountries] = useState<PublishedCountry[] | null>(null);
  const [countriesLoading, setCountriesLoading] = useState(true);
  usePublicMobileMenu(menuOpen, setMenuOpen);
  const t = copy[language];

  useSeo({
    path: '/api-developpeur',
    locale: language,
    title: publicSeoRoutes.developerApi[language].title,
    description: publicSeoRoutes.developerApi[language].description,
    breadcrumbs: [
      { name: t.home, path: '/' },
      { name: t.page, path: '/api-developpeur' },
    ],
    service: publicSeoRoutes.developerApi.service[language],
  });

  useEffect(() => {
    let active = true;
    fetch('/api/landing')
      .then((response) => response.ok ? response.json() as Promise<LandingResponse> : null)
      .then((data) => {
        if (!active) return;
        setSettings(data?.settings ?? null);
        setContent(data?.content ?? []);
        setCountries(data?.countries?.filter((country) => country.isVisible) ?? null);
        setCountriesLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setSettings(null);
        setContent([]);
        setCountries(null);
        setCountriesLoading(false);
      });
    return () => { active = false; };
  }, []);

  const toggleLanguage = () => {
    navigate(getLocalizedPath(window.location.pathname, language === 'fr' ? 'en' : 'fr'));
    setMenuOpen(false);
  };
  const closeMenu = () => setMenuOpen(false);
  const pageContact = {
    email: settings?.featuresContactEmail,
    phone: settings?.featuresContactPhone,
    whatsapp: settings?.featuresContactWhatsapp,
  };

  return (
    <div className="developer-api-page min-h-[100dvh] bg-white text-[#202833]">
      <header className="sf-features-header">
        <div className="sf-features-header-inner">
          <Brand language={language} />
          <nav className="sf-features-desktop-nav" aria-label={language === 'fr' ? 'Navigation principale' : 'Primary navigation'}>
            <Link href={getLocalizedPath('/', language)}>{t.home}</Link>
            <Link href={getLocalizedPath('/fonctionnalites', language)}>{t.features}</Link>
            <Link href={getLocalizedPath('/api-developpeur', language)} className="is-active">{t.page}</Link>
            <button type="button" onClick={toggleLanguage}>{language === 'fr' ? 'EN' : 'FR'}</button>
          </nav>
          <button
            type="button"
            className="sf-public-nav-trigger sf-features-menu-button md:!hidden"
            aria-label={t.menuOpen}
            aria-expanded={menuOpen}
            aria-controls="sf-public-mobile-navigation"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
        </div>
        {menuOpen && (
          <div className="sf-public-nav-backdrop min-[1280px]:hidden" onClick={closeMenu} role="presentation">
            <aside
              id="sf-public-mobile-navigation"
              className="sf-public-nav-panel"
              onClick={(event) => event.stopPropagation()}
              aria-label={language === 'fr' ? 'Menu principal' : 'Main menu'}
              aria-modal="true"
              role="dialog"
            >
              <div className="sf-public-nav-top">
                <Brand language={language} />
                <button type="button" className="sf-public-nav-close" onClick={closeMenu} aria-label={t.menuClose}>
                  <X size={18} />
                </button>
              </div>
              <nav className="sf-public-nav-links" aria-label={language === 'fr' ? 'Navigation principale' : 'Main navigation'}>
                <Link href={getLocalizedPath('/', language)} onClick={closeMenu} className="sf-public-nav-link">
                  <span>{t.home}</span><ChevronRight aria-hidden="true" size={17} className="sf-public-nav-link-arrow" />
                </Link>
                <Link href={getLocalizedPath('/fonctionnalites', language)} onClick={closeMenu} className="sf-public-nav-link">
                  <span>{t.features}</span><ChevronRight aria-hidden="true" size={17} className="sf-public-nav-link-arrow" />
                </Link>
                <Link href={getLocalizedPath('/api-developpeur', language)} onClick={closeMenu} className="sf-public-nav-link" aria-current="page">
                  <span>{t.page}</span><ChevronRight aria-hidden="true" size={17} className="sf-public-nav-link-arrow" />
                </Link>
              </nav>
              <div className="sf-public-nav-footer">
                <button type="button" className="sf-public-nav-language" onClick={toggleLanguage}>
                  <span>{language === 'fr' ? 'Langue' : 'Language'}</span>
                  <strong><Globe2 size={15} aria-hidden="true" />{language === 'fr' ? 'English' : 'Français'}</strong>
                </button>
              </div>
            </aside>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden px-5 pb-12 pt-28 sm:px-8 sm:pb-16 sm:pt-36">
          <div className="pointer-events-none absolute -right-28 -top-32 h-[500px] w-[500px] rounded-full bg-[#f3f7ff] sm:right-[-8%] sm:top-[-20%]" />
          <div className="pointer-events-none absolute right-[13%] top-24 h-36 w-36 rounded-full border border-[#1769ff]/10" />
          <div className="relative mx-auto grid max-w-[1180px] items-center gap-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-4">
            <div className="relative z-10 max-w-[690px]">
              <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.18em] text-[#1769ff]">
                <span className="h-px w-7 bg-[#e8cd4d]" />
                {t.eyebrow}
              </p>
              <h1 className="mt-6 max-w-[760px] text-[clamp(2.8rem,6.4vw,5.7rem)] font-extrabold leading-[.98] tracking-[-.075em] text-[#171d29]">
                {contentValue(content, 'developer.page.title', language, t.title)}
              </h1>
              <p className="mt-7 max-w-[610px] text-base font-medium leading-7 text-[#586575] sm:text-lg sm:leading-8">
                {contentValue(content, 'developer.page.intro', language, t.intro)}
              </p>
              <div className="mt-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[.12em] text-[#647184]">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-[#1769ff]/15 bg-[#f3f7ff] text-[#1769ff]">01</span>
                <span>{t.integration}</span>
                <span className="h-px w-10 bg-slate-200" />
                <span className="font-mono text-[11px] tracking-normal text-[#1769ff]">POST</span>
              </div>
            </div>
            <div className="relative -mx-2 mt-1 lg:mx-0 lg:mt-0">
              <NetworkSketch language={language} />
            </div>
          </div>
        </section>

        <section className="px-5 pb-14 sm:px-8 sm:pb-20" aria-labelledby="api-entry-heading">
          <div className="mx-auto max-w-[1120px]">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#1769ff]">{t.sectionTag}</p>
                <h2 id="api-entry-heading" className="mt-2 text-2xl font-extrabold tracking-[-.05em] text-[#171d29] sm:text-3xl">{t.detailsLabel}</h2>
              </div>
              <span className="text-xs font-semibold text-[#8792a0]">{t.contentType}</span>
            </div>
            <div className="grid overflow-hidden rounded-[22px] border border-[#dfe5ee] bg-white shadow-[0_16px_45px_rgba(25,45,80,.06)] md:grid-cols-[.7fr_1.8fr_1fr]">
              <article className="border-b border-[#e8edf3] p-5 sm:p-6 md:border-b-0 md:border-r">
                <h3 className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#788495]">{t.method}</h3>
                <p className="mt-3 inline-flex rounded-md bg-[#eaf2ff] px-2.5 py-1.5 font-mono text-sm font-extrabold tracking-wide text-[#1769ff]">POST</p>
              </article>
              <article className="min-w-0 border-b border-[#e8edf3] p-5 sm:p-6 md:border-b-0 md:border-r">
                <h3 className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#788495]">{t.endpoint}</h3>
                <p className="mt-3 break-all font-mono text-[13px] font-bold leading-6 text-[#253247] sm:text-sm">https://sendflow.africa/v2/payin/initiate</p>
              </article>
              <article className="p-5 sm:p-6">
                <h3 className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#788495]">{t.contentType}</h3>
                <p className="mt-3 break-all font-mono text-[13px] font-bold leading-6 text-[#253247] sm:text-sm">application/json</p>
              </article>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#f5f8fc] px-5 py-14 sm:px-8 sm:py-20" aria-labelledby="request-example-heading">
          <div className="pointer-events-none absolute -left-24 top-16 h-64 w-64 rounded-full border border-[#1769ff]/10" />
          <div className="relative mx-auto mb-7 flex max-w-[1120px] flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#1769ff]">{t.codeTag}</p>
              <h2 id="request-example-heading" className="mt-2 text-3xl font-extrabold tracking-[-.055em] text-[#171d29] sm:text-4xl">{t.example}</h2>
              <p className="mt-3 max-w-3xl text-sm font-medium leading-6 text-[#586575]">{t.exampleIntro}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#dfe5ee] bg-white px-3 py-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#536176]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9adacb]" />
              {t.codeLabel}
            </span>
          </div>
          <DeveloperApiCard
            reveal={false}
            eyebrow={contentValue(content, 'developer.api.eyebrow', language, t.eyebrow)}
            title={contentValue(content, 'developer.api.title', language, language === 'fr' ? 'Initiez un paiement avec l’API SendFlow.' : 'Initiate a payment with the SendFlow API.')}
            body={contentValue(content, 'developer.api.body', language, t.exampleIntro)}
            codeLabel={t.codeLabel}
            code={developerApiExample[language]}
          />
        </section>

        <section className="px-5 py-14 sm:px-8 sm:py-20" aria-labelledby="published-countries-heading">
          <div className="mx-auto max-w-[1120px] overflow-hidden rounded-[26px] border border-[#dfe5ee] bg-white shadow-[0_18px_48px_rgba(25,45,80,.055)]">
            <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#1769ff]">{t.coverageTag}</p>
                <div className="mt-4 flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#1769ff]">
                    <Globe2 size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 id="published-countries-heading" className="text-2xl font-extrabold tracking-[-.045em] text-[#171d29]">{t.markets}</h2>
                    <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-[#586575]">{t.marketsIntro}</p>
                  </div>
                </div>
              </div>
              <div className="min-h-20 lg:border-l lg:border-[#e8edf3] lg:pl-8">
                {countriesLoading ? (
                  <div className="flex flex-wrap gap-2" aria-label={t.marketsLoading} role="status">
                    {[0, 1, 2, 3].map((item) => <span key={item} className="h-9 w-24 animate-pulse rounded-full bg-[#eef2f7]" />)}
                  </div>
                ) : countries === null ? (
                  <p className="text-sm font-semibold text-[#687587]" role="status">{t.marketsUnavailable}</p>
                ) : countries.length === 0 ? (
                  <p className="text-sm font-semibold text-[#687587]" role="status">{t.noMarkets}</p>
                ) : (
                  <ul className="flex flex-wrap gap-2" aria-label={t.markets}>
                    {countries.map((country) => (
                      <li key={country.code} className="rounded-full border border-[#dce5f1] bg-[#f6f9fd] px-4 py-2 text-sm font-bold text-[#2f4056]">
                        {language === 'fr' ? country.nameFr : country.nameEn}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 sm:pb-24">
          <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-6 overflow-hidden rounded-[26px] bg-[#111827] p-7 text-white sm:flex-row sm:items-center sm:p-10">
            <div className="relative">
              <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#a9c9ff]">{t.homeLink}</p>
              <h2 className="mt-3 text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">{t.homeLink}</h2>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-[#c8d1df]">{t.ctaCopy}</p>
            </div>
            <Link
              href={getLocalizedPath('/fonctionnalites', language)}
              className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-[#e8cd4d] px-5 py-3 text-sm font-extrabold text-[#202833] transition hover:-translate-y-0.5 hover:bg-[#f3dc69]"
            >
              {t.featuresLink}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <SendFlowFooter isFrench={language === 'fr'} settings={settings} content={content} contact={pageContact} />
    </div>
  );
}
