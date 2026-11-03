import { useState } from 'react';
import { ChevronRight, Globe2, Menu, ShieldCheck, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import collectionArt from '@/assets/fees/collection-3d.webp';
import transferArt from '@/assets/fees/transfer-3d.webp';
import sendflowMark from '@/assets/brand/sendflow-mark-original.png';
import sendflowWordmark from '@/assets/brand/sendflow-wordmark-original.png';
import { ProtectedImage } from '@/components/protected-image';
import { SendFlowFooter, type FooterContentItem, type FooterSettings } from '@/components/sendflow-footer';
import OperatorFeesSection, { type FeeOperatorDisplay, type FeeSectionConfig } from '@/components/OperatorFeesSection';
import { usePublicMobileMenu } from '@/hooks/use-public-mobile-menu';
import { getLocaleFromPath, getLocalizedPath } from '@/lib/localized-routes';
import { useSeo } from '@/lib/seo';
import publicSeoRoutes from '@/lib/public-seo-routes.json';
import { OPERATOR_FEES_CONTENT_KEY, parseOperatorFeesConfig } from '@/lib/operator-fees';
import { feeOperatorLogoBySlug } from '@/lib/operator-fee-logos';
import { useQuery } from '@tanstack/react-query';

type Language = 'fr' | 'en';

type PricingLandingBundle = {
  content: FooterContentItem[];
  countries: Array<{ id: number; code: string; nameFr: string; nameEn: string; flag: string; isVisible: boolean }>;
  operators: Array<{
    id: number;
    slug: string;
    name: string;
    logoKey: string | null;
    background: string | null;
    foreground: string | null;
    isVisible: boolean;
  }>;
  countryOperators: Array<{ countryId: number; operatorId: number; orderIndex: number }>;
  media: Array<{ slug: string; publicUrl: string | null; storagePath: string | null; sourcePath: string; isVisible: boolean }>;
  settings?: FooterSettings | null;
};

const copy = {
  fr: {
    home: 'Accueil',
    pricing: 'Tarifs',
    language: 'EN',
    menuOpen: 'Ouvrir le menu',
    menuClose: 'Fermer le menu',
    eyebrow: 'Une lecture claire, avant chaque mouvement',
    title: 'Les tarifs, sans détour.',
    intro: 'Retrouvez les tarifs publiés pour les opérateurs associés en Côte d’Ivoire.',
    country: 'Côte d’Ivoire',
    published: 'Tarifs publiés',
    unavailableTitle: 'Les tarifs ne sont pas disponibles',
    unavailableBody: 'Les tarifs publiés ne peuvent pas être vérifiés pour le moment. Aucun montant ne sera affiché sans données complètes.',
    errorTitle: 'Impossible de charger les tarifs',
    errorBody: 'Le contenu public n’a pas pu être récupéré. Réessayez dans quelques instants.',
    emptyTitle: 'Aucun opérateur publié',
    emptyBody: 'Aucun opérateur visible n’est actuellement associé à la Côte d’Ivoire.',
    loading: 'Chargement des tarifs publiés',
    note: 'Les montants affichés proviennent des tarifs publiés pour la Côte d’Ivoire.',
  },
  en: {
    home: 'Home',
    pricing: 'Pricing',
    language: 'FR',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    eyebrow: 'Clear information, before every move',
    title: 'Fees, without the guesswork.',
    intro: 'Explore the published fees for associated operators in Côte d’Ivoire.',
    country: 'Côte d’Ivoire',
    published: 'Published fees',
    unavailableTitle: 'Fees are unavailable',
    unavailableBody: 'Published fees cannot be verified right now. No amount will be shown without complete data.',
    errorTitle: 'Fees could not be loaded',
    errorBody: 'Public content could not be retrieved. Please try again shortly.',
    emptyTitle: 'No operators published',
    emptyBody: 'There are currently no visible operators associated with Côte d’Ivoire.',
    loading: 'Loading published fees',
    note: 'Amounts shown are the published fees for Côte d’Ivoire.',
  },
} as const;

function usePublicLandingBundle() {
  return useQuery<PricingLandingBundle>({
    queryKey: ['/api/landing'],
    queryFn: async () => {
      const response = await fetch('/api/landing');
      if (!response.ok) throw new Error('Landing content unavailable');
      return response.json() as Promise<PricingLandingBundle>;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

function Brand() {
  return (
    <Link href="/" className="sf-pricing-brand" aria-label="SendFlow">
      <ProtectedImage src={sendflowMark} alt="" />
      <ProtectedImage src={sendflowWordmark} alt="SendFlow" />
    </Link>
  );
}

export default function PricingPage() {
  const [, navigate] = useLocation();
  const [language] = useState<Language>(() => getLocaleFromPath(window.location.pathname));
  const [menuOpen, setMenuOpen] = useState(false);
  usePublicMobileMenu(menuOpen, setMenuOpen);
  const t = copy[language];
  const seo = publicSeoRoutes.pricing[language];
  const { data, isLoading, isError, refetch } = usePublicLandingBundle();
  const content = Array.isArray(data?.content) ? data.content : [];
  const countries = Array.isArray(data?.countries) ? data.countries : [];
  const publicOperators = Array.isArray(data?.operators) ? data.operators : [];
  const countryOperators = Array.isArray(data?.countryOperators) ? data.countryOperators : [];
  const media = Array.isArray(data?.media) ? data.media : [];
  const bundleShapeValid = Boolean(
    data &&
    Array.isArray(data.content) &&
    Array.isArray(data.countries) &&
    Array.isArray(data.operators) &&
    Array.isArray(data.countryOperators) &&
    Array.isArray(data.media),
  );
  const settings = data?.settings ?? null;

  useSeo({
    path: seo.path,
    locale: language,
    title: seo.title,
    description: seo.description,
    breadcrumbs: [
      { name: language === 'fr' ? 'Accueil' : 'Home', path: getLocalizedPath('/', language) },
      { name: t.pricing, path: getLocalizedPath('/tarifs', language) },
    ],
  });

  const feeRecord = content.find((item) =>
    item.contentKey === OPERATOR_FEES_CONTENT_KEY && item.locale === 'fr' && item.isVisible,
  );
  const feeConfig = parseOperatorFeesConfig(feeRecord?.value);
  const country = countries.find((item) => item.code === 'CI' && item.isVisible);
  const countryIsValid = Boolean(
    country &&
    Number.isSafeInteger(country.id) &&
    country.id > 0 &&
    typeof country.nameFr === 'string' &&
    country.nameFr.trim() &&
    typeof country.nameEn === 'string' &&
    country.nameEn.trim(),
  );
  const operatorRates = new Map(feeConfig?.operators.map((operator) => [operator.slug, operator]) ?? []);
  const countryAssignments = country && countryIsValid
    ? countryOperators.filter((assignment) => assignment.countryId === country.id).sort((a, b) => a.orderIndex - b.orderIndex)
    : [];
  const operators: FeeOperatorDisplay[] = country && countryIsValid
    ? countryAssignments.flatMap((assignment) => {
      const operator = publicOperators.find((item) => item.id === assignment.operatorId && item.isVisible);
      if (!operator) return [];
      const rate = operatorRates.get(operator.slug);
      const logo = operator.logoKey
        ? media.find((item) => item.slug === operator.logoKey && item.isVisible && item.publicUrl)
        : undefined;
      const fallbackLogo = feeOperatorLogoBySlug[operator.slug];
      return rate ? [{
        slug: operator.slug,
        name: operator.name,
        logoUrl: logo?.publicUrl ?? fallbackLogo?.image ?? null,
        background: operator.background ?? fallbackLogo?.background ?? null,
        foreground: operator.foreground ?? fallbackLogo?.foreground ?? null,
        collectionPercent: rate.collectionPercent,
        transferPercent: rate.transferPercent,
      }] : [];
    })
    : [];
  operators.sort((a, b) => a.name.localeCompare(b.name, language));
  const visibleAssignedOperators = country && countryIsValid
    ? publicOperators.filter((operator) =>
      operator.isVisible && countryOperators.some((assignment) =>
        assignment.countryId === country.id && assignment.operatorId === operator.id,
      ),
    )
    : [];
  const hasMissingRates = visibleAssignedOperators.some((operator) => !operatorRates.has(operator.slug));
  const unavailable = !isLoading && !isError && (!bundleShapeValid || !feeConfig || !countryIsValid || hasMissingRates);
  const empty = !isLoading && !isError && !unavailable && operators.length === 0;
  const feeSectionConfig: FeeSectionConfig | null = feeConfig && countryIsValid && !hasMissingRates
    ? {
      collectionTitle: language === 'fr' ? feeConfig.collectionTitleFr : feeConfig.collectionTitleEn,
      transferTitle: language === 'fr' ? feeConfig.transferTitleFr : feeConfig.transferTitleEn,
      bankTransferLabel: language === 'fr' ? feeConfig.bankTransferLabelFr : feeConfig.bankTransferLabelEn,
      bankTransferAmountXof: feeConfig.bankTransferAmountXof,
      operators,
    }
    : null;
  const closeMenu = () => setMenuOpen(false);
  const toggleLanguage = () => {
    navigate(getLocalizedPath('/tarifs', language === 'fr' ? 'en' : 'fr'));
    closeMenu();
  };

  return (
    <div className="sf-pricing-page">
      <style>{`
        .sf-pricing-page { --sf-violet:#6d35d8; --sf-violet-deep:#45218f; --sf-ink:#20172f; --sf-muted:#736d80; --sf-line:#e8e1f2; --sf-paper:#fbf9ff; color:var(--sf-ink); background:var(--sf-paper); font-family:'Satoshi','Work Sans',ui-sans-serif,sans-serif; min-height:100dvh; }
        .sf-pricing-page * { box-sizing:border-box; }
        .sf-pricing-header { height:76px; position:relative; z-index:20; background:rgba(251,249,255,.9); border-bottom:1px solid rgba(109,53,216,.1); }
        .sf-pricing-header-inner { width:min(1180px,calc(100% - 48px)); height:100%; margin:auto; display:flex; align-items:center; justify-content:space-between; }
        .sf-pricing-brand { display:flex; align-items:center; gap:9px; text-decoration:none; }
        .sf-pricing-brand img:first-child { width:34px; height:34px; object-fit:contain; }
        .sf-pricing-brand img:last-child { width:108px; height:auto; }
        .sf-pricing-nav { display:flex; align-items:center; gap:34px; }
        .sf-pricing-nav a,.sf-pricing-nav button { color:#4d465a; text-decoration:none; font-family:'Work Sans',sans-serif; font-size:14px; font-weight:600; border:0; background:none; cursor:pointer; }
        .sf-pricing-nav a.is-active { color:var(--sf-violet); }
        .sf-pricing-nav button { display:flex; align-items:center; gap:8px; }
        .sf-pricing-menu-button { display:none; width:42px; height:42px; align-items:center; justify-content:center; border:1px solid var(--sf-line); border-radius:14px; color:var(--sf-violet); background:#fff; }
        .sf-pricing-hero { position:relative; overflow:hidden; padding:66px 24px 54px; background:radial-gradient(ellipse at 75% 30%,rgba(173,139,242,.21),transparent 38%),linear-gradient(132deg,#f5efff 0%,#fbf9ff 54%,#f2ebff 100%); }
        .sf-pricing-hero::before { content:''; position:absolute; width:580px; height:580px; right:-180px; top:-270px; border:1px solid rgba(109,53,216,.12); border-radius:50%; box-shadow:0 0 0 44px rgba(109,53,216,.025),0 0 0 95px rgba(109,53,216,.025); }
        .sf-pricing-hero-inner { position:relative; width:min(1180px,100%); margin:auto; display:grid; grid-template-columns:minmax(0,1fr) minmax(280px,.68fr); align-items:center; gap:20px; }
        .sf-pricing-eyebrow { display:flex; align-items:center; gap:9px; margin:0 0 22px; color:var(--sf-violet); font-size:12px; font-weight:800; letter-spacing:.13em; text-transform:uppercase; }
        .sf-pricing-eyebrow::before { content:''; width:25px; height:1px; background:currentColor; }
        .sf-pricing-hero h1 { max-width:690px; margin:0; font-size:clamp(44px,7vw,78px); line-height:.98; letter-spacing:-.065em; font-weight:750; color:#24153d; }
        .sf-pricing-hero h1 span { color:var(--sf-violet); }
        .sf-pricing-hero-copy { max-width:530px; margin:22px 0 0; color:#655d71; font-size:17px; line-height:1.65; }
        .sf-pricing-country-pill { display:inline-flex; align-items:center; gap:10px; margin-top:29px; border:1px solid rgba(109,53,216,.16); border-radius:99px; padding:9px 14px 9px 10px; background:rgba(255,255,255,.68); color:#443956; font-size:13px; font-weight:700; }
        .sf-pricing-country-pill span:first-child { display:grid; width:27px; height:27px; place-items:center; border-radius:50%; background:#f0e9ff; color:var(--sf-violet); }
        .sf-pricing-hero-art { position:relative; height:260px; display:grid; place-items:center; }
        .sf-pricing-art-disc { position:absolute; width:245px; height:245px; border-radius:50%; background:radial-gradient(circle at 35% 27%,#fff 0%,#e9dcff 56%,#d9c5ff 100%); box-shadow:inset -18px -24px 50px rgba(109,53,216,.16),0 28px 60px rgba(79,47,138,.12); }
        .sf-pricing-hero-art img { position:relative; width:270px; height:270px; object-fit:contain; filter:drop-shadow(0 15px 18px rgba(70,38,128,.16)); animation:sf-pricing-float 6s ease-in-out infinite; }
        .sf-pricing-hero-art .sf-pricing-hero-art-secondary { position:absolute; right:-6px; bottom:0; width:128px; height:128px; animation-delay:1s; }
        .sf-pricing-orbit { position:absolute; width:310px; height:110px; border:1px solid rgba(109,53,216,.24); border-radius:50%; transform:rotate(-23deg); }
        .sf-pricing-orbit::after { content:''; position:absolute; width:9px; height:9px; border-radius:50%; top:17px; right:35px; background:#9c76e8; box-shadow:0 0 0 7px rgba(156,118,232,.12); }
        @keyframes sf-pricing-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        .sf-pricing-main { padding:60px 24px 88px; }
        .sf-pricing-main-inner { width:min(1120px,100%); margin:0 auto; }
        .sf-pricing-section-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin:0 0 24px; }
        .sf-pricing-section-heading p { margin:0; color:var(--sf-muted); font-size:13px; }
        .sf-pricing-section-heading h2 { margin:0; color:#332447; font-size:24px; letter-spacing:-.04em; }
        .sf-pricing-public-badge { display:flex; align-items:center; gap:8px; border:1px solid #ded4f0; border-radius:99px; background:#fff; padding:9px 13px; color:#5b3a91; font-size:12px; font-weight:700; white-space:nowrap; }
        .sf-pricing-public-badge span { width:7px; height:7px; border-radius:50%; background:#7d55ce; }
        .sf-pricing-cards { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; align-items:stretch; }
        .sf-pricing-card { overflow:hidden; position:relative; display:grid; grid-template-columns:36% minmax(0,1fr); min-height:442px; border:1px solid #e4dbf1; border-radius:24px; background:#fff; box-shadow:0 18px 55px rgba(63,38,107,.07); transition:transform .25s ease,box-shadow .25s ease; }
        .sf-pricing-card:hover { transform:translateY(-4px); box-shadow:0 24px 60px rgba(63,38,107,.12); }
        .sf-pricing-card-visual { position:relative; overflow:hidden; display:flex; align-items:flex-start; justify-content:center; padding:26px 8px 20px; background:linear-gradient(155deg,#f0e8ff 0%,#f8f4ff 55%,#ebe1fc 100%); }
        .sf-pricing-card--transfer .sf-pricing-card-visual { background:linear-gradient(150deg,#e9e8ff 0%,#f5f3ff 52%,#e4ddff 100%); }
        .sf-pricing-card-visual img { z-index:1; width:180px; max-width:130%; height:170px; object-fit:contain; }
        .sf-pricing-visual-orbit { position:absolute; width:210px; height:112px; left:50%; top:74px; transform:translateX(-50%) rotate(-24deg); border:1px solid rgba(109,53,216,.22); border-radius:50%; }
        .sf-pricing-card--transfer .sf-pricing-visual-orbit { transform:translateX(-50%) rotate(22deg); }
        .sf-pricing-visual-index { position:absolute; bottom:22px; left:22px; color:rgba(76,43,130,.5); font:700 11px 'Work Sans',sans-serif; letter-spacing:.15em; }
        .sf-pricing-card-content { min-width:0; padding:27px 25px 22px; }
        .sf-pricing-card-heading { display:flex; align-items:center; gap:9px; color:#756b84; font-size:12px; font-weight:650; }
        .sf-pricing-card-icon { width:29px; height:29px; display:grid; place-items:center; border-radius:10px; background:#f1eaff; color:var(--sf-violet); }
        .sf-pricing-card h2 { margin:15px 0 23px; color:#241938; font-size:clamp(23px,2.2vw,30px); line-height:1.1; letter-spacing:-.055em; }
        .sf-pricing-list-label { margin:0 0 9px; color:#8b8495; font-size:10px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; }
        .sf-pricing-operator-list { margin:0; padding:0; list-style:none; }
        .sf-pricing-operator { display:grid; grid-template-columns:36px minmax(0,1fr) auto; align-items:center; gap:10px; min-height:56px; border-top:1px solid #f0edf4; }
        .sf-pricing-operator-mark { display:grid; width:34px; height:34px; overflow:hidden; place-items:center; border:1px solid rgba(83,53,137,.1); border-radius:12px; font-size:10px; font-weight:850; }
        .sf-pricing-operator-mark.has-logo { padding:5px; background:#fff; }
        .sf-pricing-operator-mark img { display:block; width:100%; height:100%; object-fit:contain; }
        .sf-pricing-operator-name { min-width:0; overflow-wrap:anywhere; color:#393146; font-size:13px; font-weight:650; }
        .sf-pricing-amount { color:#4d258f; font:700 15px 'Work Sans',sans-serif; font-variant-numeric:tabular-nums; white-space:nowrap; }
        .sf-pricing-bank-row { display:grid; grid-template-columns:36px minmax(0,1fr) auto; align-items:center; gap:10px; margin-top:10px; border:1px solid #e9e2f3; border-radius:15px; padding:10px 11px; background:#faf8fe; }
        .sf-pricing-bank-icon { display:grid; width:34px; height:34px; place-items:center; border-radius:11px; background:#efe9fa; color:#6440a0; }
        .sf-pricing-bank-copy { min-width:0; display:flex; flex-direction:column; gap:3px; }
        .sf-pricing-bank-copy strong { color:#393146; font-size:12px; line-height:1.2; }
        .sf-pricing-bank-copy small { color:#8b8495; font-size:10px; }
        .sf-pricing-bank-row .sf-pricing-amount { font-size:13px; }
        .sf-pricing-bank-row .sf-pricing-amount span { font-size:10px; }
        .sf-pricing-note { display:flex; align-items:flex-start; gap:10px; max-width:720px; margin:24px auto 0; color:#746d7f; font-size:12px; line-height:1.55; text-align:center; justify-content:center; }
        .sf-pricing-note svg { flex:none; margin-top:1px; color:#8061b2; }
        .sf-pricing-state { border:1px solid #e4dbf1; border-radius:23px; background:linear-gradient(135deg,#fff,#f7f2ff); padding:44px 24px; text-align:center; box-shadow:0 18px 55px rgba(63,38,107,.06); }
        .sf-pricing-state-mark { display:grid; width:50px; height:50px; place-items:center; margin:0 auto 16px; border-radius:17px; background:#efe7fb; color:var(--sf-violet); }
        .sf-pricing-state h2 { margin:0; color:#302143; font-size:22px; letter-spacing:-.035em; }
        .sf-pricing-state p { max-width:450px; margin:10px auto 0; color:#756d80; font-size:14px; line-height:1.6; }
        .sf-pricing-retry { display:inline-flex; align-items:center; gap:8px; margin-top:20px; border:0; border-radius:99px; padding:11px 16px; background:var(--sf-violet); color:#fff; font-family:'Work Sans',sans-serif; font-size:13px; font-weight:700; cursor:pointer; }
        .sf-pricing-skeletons { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:20px; }
        .sf-pricing-skeleton { min-height:400px; border:1px solid #ebe4f3; border-radius:24px; background:linear-gradient(100deg,#fff 20%,#f3eef9 38%,#fff 56%); animation:sf-pricing-shimmer 1.5s ease-in-out infinite alternate; }
        @keyframes sf-pricing-shimmer { to { opacity:.62; } }
        .sf-pricing-footer-space { height:1px; }
        @media (max-width:900px) { .sf-pricing-card { grid-template-columns:1fr; } .sf-pricing-card-visual { height:150px; padding:6px 8px; align-items:center; } .sf-pricing-card-visual img { width:160px; height:150px; } .sf-pricing-visual-orbit { top:22px; } .sf-pricing-visual-index { bottom:14px; left:17px; } .sf-pricing-card-content { padding:21px 20px 22px; } .sf-pricing-card h2 { margin:12px 0 17px; } }
        @media (max-width:680px) { .sf-pricing-header { height:66px; } .sf-pricing-header-inner { width:calc(100% - 34px); } .sf-pricing-nav { display:none; } .sf-pricing-menu-button { display:flex; } .sf-pricing-hero { padding:50px 20px 35px; } .sf-pricing-hero-inner { grid-template-columns:1fr; gap:0; } .sf-pricing-hero h1 { font-size:clamp(45px,12vw,65px); } .sf-pricing-hero-copy { margin-top:17px; font-size:15px; } .sf-pricing-country-pill { margin-top:20px; } .sf-pricing-hero-art { height:200px; margin-top:3px; } .sf-pricing-art-disc { width:176px; height:176px; } .sf-pricing-hero-art img { width:214px; height:214px; } .sf-pricing-orbit { width:250px; height:85px; } .sf-pricing-main { padding:37px 16px 58px; } .sf-pricing-section-heading { align-items:flex-start; flex-direction:column; gap:11px; margin-bottom:17px; } .sf-pricing-section-heading h2 { font-size:21px; } .sf-pricing-cards,.sf-pricing-skeletons { grid-template-columns:1fr; gap:15px; } .sf-pricing-card { grid-template-columns:34% minmax(0,1fr); min-height:0; } .sf-pricing-card-visual { height:auto; min-height:100%; align-items:flex-start; padding:18px 3px; } .sf-pricing-card-visual img { width:150px; height:150px; } .sf-pricing-visual-orbit { width:160px; top:60px; } .sf-pricing-card-content { padding:20px 16px 17px; } .sf-pricing-card h2 { font-size:23px; margin:12px 0 17px; } .sf-pricing-operator { grid-template-columns:32px minmax(0,1fr) auto; gap:7px; min-height:51px; } .sf-pricing-operator-mark { width:31px; height:31px; border-radius:10px; } .sf-pricing-operator-name { font-size:12px; } .sf-pricing-amount { font-size:13px; } .sf-pricing-bank-row { grid-template-columns:32px minmax(0,1fr); gap:7px; } .sf-pricing-bank-icon { width:31px; height:31px; } .sf-pricing-bank-row .sf-pricing-amount { grid-column:2; margin-top:-3px; } .sf-pricing-state { padding:34px 18px; } .sf-pricing-backdrop { position:fixed; inset:0; z-index:60; background:rgba(28,18,45,.38); } .sf-pricing-panel { position:absolute; top:0; right:0; bottom:0; display:flex; width:min(370px,88vw); flex-direction:column; padding:22px; background:#fbf9ff; box-shadow:-18px 0 50px rgba(25,15,43,.18); } .sf-pricing-panel-top { display:flex; align-items:center; justify-content:space-between; } .sf-pricing-close { display:grid; width:40px; height:40px; place-items:center; border:1px solid var(--sf-line); border-radius:13px; background:#fff; color:#5e4a78; } .sf-pricing-mobile-links { display:grid; gap:8px; margin-top:35px; } .sf-pricing-mobile-links a { display:flex; align-items:center; justify-content:space-between; padding:15px 12px; border-radius:13px; color:#40334f; font-weight:650; text-decoration:none; } .sf-pricing-mobile-links a.is-active { background:#f0e8fb; color:var(--sf-violet); } .sf-pricing-language { display:flex; align-items:center; gap:8px; margin-top:auto; padding:14px 12px; border:1px solid var(--sf-line); border-radius:13px; background:#fff; color:#4d3a67; font-family:'Work Sans',sans-serif; font-size:14px; font-weight:650; } }
        @media (max-width:390px) { .sf-pricing-card { grid-template-columns:1fr; } .sf-pricing-card-visual { height:122px; min-height:0; padding:0; } .sf-pricing-card-visual img { width:145px; height:145px; } .sf-pricing-visual-orbit { top:33px; } .sf-pricing-visual-index { bottom:10px; } .sf-pricing-card-content { padding:18px 17px; } }
        @media (prefers-reduced-motion:reduce) { .sf-pricing-hero-art img,.sf-pricing-skeleton { animation:none; } .sf-pricing-card { transition:none; } }
      `}</style>
      <header className="sf-pricing-header">
        <div className="sf-pricing-header-inner">
          <Brand />
          <nav className="sf-pricing-nav" aria-label={language === 'fr' ? 'Navigation principale' : 'Main navigation'}>
            <Link href={getLocalizedPath('/', language)}>{t.home}</Link>
            <Link href={getLocalizedPath('/tarifs', language)} className="is-active" aria-current="page">{t.pricing}</Link>
            <button type="button" onClick={toggleLanguage} aria-label={language === 'fr' ? 'Switch to English' : 'Passer en français'}>
              <Globe2 size={15} aria-hidden="true" />{t.language}
            </button>
          </nav>
          <button
            type="button"
            className="sf-pricing-menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label={t.menuOpen}
            aria-expanded={menuOpen}
            aria-controls="sf-pricing-mobile-navigation"
            data-testid="button-open-menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>
      {menuOpen && (
        <div className="sf-pricing-backdrop" onClick={closeMenu} role="presentation">
          <aside
            id="sf-pricing-mobile-navigation"
            className="sf-pricing-panel"
            onClick={(event) => event.stopPropagation()}
            aria-label={language === 'fr' ? 'Menu principal' : 'Main menu'}
            aria-modal="true"
            role="dialog"
          >
            <div className="sf-pricing-panel-top">
              <Brand />
              <button type="button" className="sf-pricing-close" onClick={closeMenu} aria-label={t.menuClose} data-testid="button-close-menu"><X size={19} /></button>
            </div>
            <nav className="sf-pricing-mobile-links" aria-label={language === 'fr' ? 'Navigation principale' : 'Main navigation'}>
              <Link href={getLocalizedPath('/', language)} onClick={closeMenu}>{t.home}<ChevronRight size={17} /></Link>
              <Link href={getLocalizedPath('/tarifs', language)} onClick={closeMenu} className="is-active" aria-current="page">{t.pricing}<ChevronRight size={17} /></Link>
            </nav>
            <button type="button" className="sf-pricing-language" onClick={toggleLanguage}><Globe2 size={16} />{language === 'fr' ? 'English' : 'Français'}</button>
          </aside>
        </div>
      )}

      <main>
        <section className="sf-pricing-hero" aria-labelledby="sf-pricing-title">
          <div className="sf-pricing-hero-inner">
            <div>
              <p className="sf-pricing-eyebrow">{t.eyebrow}</p>
              <h1 id="sf-pricing-title">{language === 'fr' ? <>Les tarifs,<br /><span>sans détour.</span></> : <>Fees,<br /><span>without the guesswork.</span></>}</h1>
              <p className="sf-pricing-hero-copy">{t.intro}</p>
              <div className="sf-pricing-country-pill"><span aria-hidden="true"><Globe2 size={15} /></span>{countryIsValid && country ? country[language === 'fr' ? 'nameFr' : 'nameEn'] : t.country}</div>
            </div>
            <div className="sf-pricing-hero-art" aria-hidden="true">
              <div className="sf-pricing-art-disc" />
              <div className="sf-pricing-orbit" />
              <img className="sf-pricing-hero-art-primary" src={collectionArt} alt="" />
              <img className="sf-pricing-hero-art-secondary" src={transferArt} alt="" />
            </div>
          </div>
        </section>

        <section className="sf-pricing-main" aria-labelledby="sf-pricing-categories">
          <div className="sf-pricing-main-inner">
            <div className="sf-pricing-section-heading">
              <div>
                <p>{language === 'fr' ? 'Côte d’Ivoire · XOF' : 'Côte d’Ivoire · XOF'}</p>
                <h2 id="sf-pricing-categories">{language === 'fr' ? 'Deux catégories de frais' : 'Two fee categories'}</h2>
              </div>
              <div className="sf-pricing-public-badge"><span aria-hidden="true" />{t.published}</div>
            </div>

            {isLoading ? (
              <div className="sf-pricing-skeletons" aria-label={t.loading} role="status" data-testid="status-pricing-loading">
                <div className="sf-pricing-skeleton" />
                <div className="sf-pricing-skeleton" />
              </div>
            ) : isError ? (
              <div className="sf-pricing-state" role="alert" data-testid="status-pricing-error">
                <span className="sf-pricing-state-mark"><X size={22} aria-hidden="true" /></span>
                <h2>{t.errorTitle}</h2>
                <p>{t.errorBody}</p>
                <button className="sf-pricing-retry" type="button" onClick={() => void refetch()} data-testid="button-retry-pricing">
                  {language === 'fr' ? 'Réessayer' : 'Try again'}<ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            ) : unavailable ? (
              <div className="sf-pricing-state" role="status" data-testid="status-pricing-unavailable">
                <span className="sf-pricing-state-mark"><ShieldCheck size={22} aria-hidden="true" /></span>
                <h2>{t.unavailableTitle}</h2>
                <p>{t.unavailableBody}</p>
              </div>
            ) : empty ? (
              <div className="sf-pricing-state" role="status" data-testid="status-pricing-empty">
                <span className="sf-pricing-state-mark"><Globe2 size={22} aria-hidden="true" /></span>
                <h2>{t.emptyTitle}</h2>
                <p>{t.emptyBody}</p>
              </div>
            ) : feeSectionConfig ? (
              <>
                <OperatorFeesSection language={language} config={feeSectionConfig} defaultOpen />
                <p className="sf-pricing-note"><ShieldCheck size={15} aria-hidden="true" />{t.note}</p>
              </>
            ) : null}
          </div>
        </section>
      </main>
      <div className="sf-pricing-footer-space" />
      <SendFlowFooter isFrench={language === 'fr'} settings={settings} content={content} />
    </div>
  );
}
