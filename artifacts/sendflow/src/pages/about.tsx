import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Globe2,
  GraduationCap,
  Instagram,
  Linkedin,
  Pause,
  Play,
  Quote,
  RefreshCw,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { SiGmail } from 'react-icons/si';
import sendflowMark from '@assets/sendflow-mark-original.png';
import founderPortrait from '@assets/file_00000000d41881f4b07497287b39201e_1789085205545.png';
import aboutHeroHandshake from '@assets/file_00000000f8e081f489c8c5b8c185ca4e_1789621548418.png';
import { ABOUT_HERO_ASSETS, ABOUT_HERO_ASSET_BY_KEY } from '@/lib/aboutCarouselAssets';
import crossNetworkIcon from '../assets/sendflow-icon-cross-network.svg';
import internationalTransferIcon from '../assets/sendflow-icon-international-transfer.svg';
import visibleDetailsIcon from '../assets/sendflow-icon-visible-details.svg';
import { ProtectedImage } from '@/components/protected-image';
import { getTelHref, getWhatsAppHref, type ContactDetails } from '@/lib/contact';
import { aboutLongform, type AboutLongformSection } from '@/pages/about-longform';

export type AboutLocale = 'fr' | 'en';

export type FounderProfile = {
  name: string;
  role: string;
  photoUrl?: string | null;
  shortBio: string;
  story: string;
  vision: string;
  mission: string;
  education: string;
  linkedinUrl?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  xUrl?: string | null;
};

export type AboutPageProps = {
  locale: AboutLocale;
  profile: FounderProfile;
  content?: Array<{ contentKey: string; locale: string; value: string; isVisible: boolean }>;
  heroSlides?: Array<{
    slug: string;
    orderIndex: number;
    titleFr: string;
    titleEn: string;
    imageKey: string | null;
    isVisible: boolean;
  }>;
  media?: Array<{ slug: string; publicUrl: string | null; isVisible: boolean }>;
  onBackHome: () => void;
  onDownload: () => void;
  onChangeLocale?: (locale: AboutLocale) => void;
  contact?: ContactDetails;
};

type Copy = {
  fr: string;
  en: string;
};

const copy = (value: Copy, locale: AboutLocale) => value[locale];

const editorialFallbacks: Record<string, Copy> = {
  'about.hero.kicker': { fr: 'L’histoire derrière SendFlow', en: 'The story behind SendFlow' },
  'about.hero.title': { fr: 'L’argent circule mieux quand les gens se comprennent.', en: 'Money moves better when people understand each other.' },
  'about.hero.intro': { fr: 'SendFlow est né d’une intuition simple : la technologie financière ne devrait pas ajouter de distance. Elle devrait rendre les liens plus directs, les choix plus lisibles et les transferts plus humains.', en: 'SendFlow was born from a simple intuition: financial technology should not add distance. It should make connections more direct, choices clearer, and transfers more human.' },
  'about.hero.founderCta': { fr: 'Rencontrer le fondateur', en: 'Meet the founder' },
  'about.hero.missionCta': { fr: 'Notre raison d’être', en: 'Our reason why' },
  'about.mission.kicker': { fr: 'Une conviction concrète', en: 'A practical conviction' },
  'about.mission.title': { fr: 'Rendre la simplicité accessible à tous.', en: 'Make simplicity accessible to everyone.' },
  'about.mission.label': { fr: 'Notre mission', en: 'Our mission' },
  'about.vision.label': { fr: 'Notre vision', en: 'Our vision' },
  'about.path.kicker': { fr: 'Le chemin', en: 'The path' },
  'about.path.title': { fr: 'Une idée qui a pris racine dans le réel.', en: 'An idea rooted in real life.' },
  'about.path.intro': { fr: 'Pas de raccourci spectaculaire. Un apprentissage patient : écouter, comprendre les contraintes, puis construire quelque chose qui tient.', en: 'No spectacular shortcut. A patient practice: listen, understand the constraints, then build something that holds.' },
  'about.benefits.kicker': { fr: 'Ce que SendFlow rend possible', en: 'What SendFlow makes possible' },
  'about.benefits.title': { fr: 'Moins de friction. Plus de mouvement.', en: 'Less friction. More movement.' },
  'about.founder.kicker': { fr: 'À l’origine du mouvement', en: 'At the origin of the movement' },
  'about.founder.title': { fr: 'Le visage derrière le produit.', en: 'The person behind the product.' },
  'about.cta.kicker': { fr: 'La suite s’écrit ensemble', en: 'The next chapter is shared' },
  'about.cta.title': { fr: 'Prêt à faire circuler les possibles ?', en: 'Ready to keep possibilities moving?' },
  'about.cta.button': { fr: 'Découvrir SendFlow', en: 'Discover SendFlow' },
  'about.card.tagline': { fr: 'Tout circule.', en: 'Keep it moving.' },
  'about.feature.start.title': { fr: 'Un seul point de départ', en: 'One starting point' },
  'about.feature.start.body': { fr: 'Choisissez un pays, un réseau et un bénéficiaire depuis un parcours pensé pour être compris du premier coup.', en: 'Choose a country, a network, and a recipient through a journey designed to be understood at first glance.' },
  'about.feature.trust.title': { fr: 'Une confiance lisible', en: 'Trust you can read' },
  'about.feature.trust.body': { fr: 'Les informations essentielles restent visibles : qui reçoit, combien, quand et où en est le transfert.', en: 'The essentials stay visible: who receives, how much, when, and where the transfer stands.' },
  'about.feature.borders.title': { fr: 'Des frontières moins lourdes', en: 'Lighter borders' },
  'about.feature.borders.body': { fr: 'SendFlow rapproche les réseaux locaux pour que la distance géographique ne dicte plus la distance humaine.', en: 'SendFlow brings local networks closer so geography does not dictate human distance.' },
  'about.footer.tagline': { fr: 'Des liens qui avancent.', en: 'Connections in motion.' },
  'about.footer.initiative': { fr: 'Une initiative Flow Digital SARL.', en: 'An initiative by Flow Digital SARL.' },
};

const colors = {
  ivory: '#ffffff',
  paper: '#ffffff',
  violet: '#6d35d8',
  violetDark: '#5822c3',
  yellow: '#e8cd4d',
  navy: '#17131f',
  navySoft: '#3d3943',
  violetPale: '#f4f0ff',
  line: '#e5ddf2',
} as const;

const sectionKicker = 'mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em]';

function LocaleFlag({ locale }: { locale: AboutLocale }) {
  if (locale === 'fr') {
    return (
      <svg viewBox="0 0 24 16" aria-hidden="true" focusable="false" className="h-4 w-6 overflow-hidden rounded-[2px] shadow-sm">
        <rect width="8" height="16" fill="#002395" />
        <rect x="8" width="8" height="16" fill="#ffffff" />
        <rect x="16" width="8" height="16" fill="#ed2939" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 16" aria-hidden="true" focusable="false" className="h-4 w-6 overflow-hidden rounded-[2px] shadow-sm">
      <rect width="24" height="16" fill="#012169" />
      <path d="M-2 -1 26 17 M26 -1 -2 17" stroke="#ffffff" strokeWidth="4" />
      <path d="M-2 -1 26 17 M26 -1 -2 17" stroke="#c8102e" strokeWidth="1.6" />
      <path d="M12 0v16M0 8h24" stroke="#ffffff" strokeWidth="5" />
      <path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="2.6" />
    </svg>
  );
}

function FounderPhoto({ profile }: { profile: FounderProfile }) {
  const [hasImageError, setHasImageError] = useState(false);
  const imageUrl = profile.photoUrl || founderPortrait;
  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  if (hasImageError) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-[#6d35d8] p-8"
        aria-label={profile.name}
      >
        <div className="flex h-36 w-36 items-center justify-center rounded-full border-[10px] border-[#e6d8ff] bg-[#f4f0ff] text-5xl font-bold tracking-[-0.08em] text-[#17243e] shadow-[0_18px_0_rgba(23,36,62,.12)] sm:h-48 sm:w-48 sm:text-6xl">
          {initials || <UserRound size={62} strokeWidth={1.5} />}
        </div>
      </div>
    );
  }

  return (
    <ProtectedImage
      src={imageUrl}
      alt={profile.name}
      className="h-full w-full object-cover"
      style={{ objectPosition: '50% 24%' }}
      onError={() => setHasImageError(true)}
    />
  );
}

function Mark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white shadow-[0_5px_14px_rgba(23,36,62,.12)] ring-1 ring-[#6d35d8]/20 ${className}`}>
      <ProtectedImage src={sendflowMark} alt="" className="h-9 w-9 object-contain" />
    </span>
  );
}

function Feature({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="about-document-feature">
      <h3>
        <span aria-hidden="true">•</span>
        {title}
      </h3>
      <p className="about-document-copy">
        {description}
      </p>
    </article>
  );
}

function AboutSectionHeading({
  number,
  title,
  illustration,
  illustrationAlt,
}: {
  number: string;
  title: string;
  illustration?: string;
  illustrationAlt?: string;
}) {
  return (
    <div className="about-document-heading">
      <p className="about-document-number">{number}</p>
      <h2>{title}</h2>
      {illustration && (
        <img
          src={illustration}
          alt={illustrationAlt ?? ''}
          className="about-document-illustration"
          loading="lazy"
        />
      )}
    </div>
  );
}

function AboutLongform({ section, locale }: { section: AboutLongformSection; locale: AboutLocale }) {
  return (
    <div className="about-document-longform">
      {aboutLongform[section][locale].map((paragraph, index) => (
        <p className="about-document-copy" key={`${section}-${locale}-${index}`}>{paragraph}</p>
      ))}
    </div>
  );
}

export function AboutPage({ locale, profile, content = [], heroSlides, media = [], onBackHome, onDownload, onChangeLocale, contact }: AboutPageProps) {
  const isFrench = locale === 'fr';
  const contactEmail = contact?.email?.trim() || profile.email?.trim() || '';
  const contactPhone = contact?.phone?.trim() || '';
  const contactPhoneHref = getTelHref(contactPhone);
  const contactWhatsappHref = getWhatsAppHref(contact?.whatsapp);
  const t = (value: Copy) => {
    const key = Object.entries(editorialFallbacks).find(([, fallback]) => fallback.fr === value.fr && fallback.en === value.en)?.[0];
    const override = key ? content.find((item) => item.contentKey === key && item.locale === locale && item.isVisible) : undefined;
    return override?.value ?? copy(value, locale);
  };
  const resolvedHeroSlides = useMemo(() => {
    const configuredSlides = heroSlides?.filter((slide) => slide.isVisible).slice().sort((a, b) => a.orderIndex - b.orderIndex);
    const sourceSlides = configuredSlides?.length
      ? configuredSlides
      : ABOUT_HERO_ASSETS.map((asset, orderIndex) => ({
        slug: asset.key,
        orderIndex,
        titleFr: asset.altFr,
        titleEn: asset.altEn,
        imageKey: asset.key,
        isVisible: true,
      }));

    const resolved = sourceSlides.flatMap((slide) => {
      const imageKey = slide.imageKey?.trim() ?? '';
      const bundledAsset = ABOUT_HERO_ASSET_BY_KEY[imageKey];
      const uploadedImage = media.find((item) => item.slug === imageKey && item.isVisible)?.publicUrl;
      const src = bundledAsset?.src ?? uploadedImage;
      if (!src) return [];
      return [{
        id: slide.slug || imageKey,
        src,
        alt: locale === 'fr'
          ? slide.titleFr?.trim() || bundledAsset?.altFr || 'Portrait illustratif d’un professionnel SendFlow'
          : slide.titleEn?.trim() || bundledAsset?.altEn || 'Illustrative portrait of a SendFlow professional',
      }];
    });

    return resolved.length > 0
      ? resolved
      : [{
        id: ABOUT_HERO_ASSETS[0].key,
        src: ABOUT_HERO_ASSETS[0].src,
        alt: locale === 'fr' ? ABOUT_HERO_ASSETS[0].altFr : ABOUT_HERO_ASSETS[0].altEn,
      }];
  }, [heroSlides, locale, media]);
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [heroAutoRotateEnabled, setHeroAutoRotateEnabled] = useState(true);
  const [heroHoverPaused, setHeroHoverPaused] = useState(false);
  const [heroFocusPaused, setHeroFocusPaused] = useState(false);
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const activeHeroSlide = resolvedHeroSlides[heroSlideIndex] ?? resolvedHeroSlides[0];

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPrefersReducedMotion(query.matches);
    updatePreference();
    query.addEventListener('change', updatePreference);
    return () => query.removeEventListener('change', updatePreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === 'visible');
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    setHeroSlideIndex((current) => current % resolvedHeroSlides.length);
    setHeroImageFailed(false);
  }, [resolvedHeroSlides.length]);

  useEffect(() => {
    if (
      resolvedHeroSlides.length < 2 ||
      !heroAutoRotateEnabled ||
      heroHoverPaused ||
      heroFocusPaused ||
      prefersReducedMotion ||
      !pageVisible
    ) return undefined;

    const interval = window.setInterval(() => {
      setHeroSlideIndex((current) => (current + 1) % resolvedHeroSlides.length);
    }, 5_500);
    return () => window.clearInterval(interval);
  }, [heroAutoRotateEnabled, heroFocusPaused, heroHoverPaused, pageVisible, prefersReducedMotion, resolvedHeroSlides.length]);

  useEffect(() => {
    setHeroImageFailed(false);
  }, [heroSlideIndex]);

  const goToHeroSlide = (index: number) => {
    setHeroSlideIndex((index + resolvedHeroSlides.length) % resolvedHeroSlides.length);
  };

  const storySteps = [
    {
      year: t({ fr: 'Le déclic', en: 'The spark' }),
      title: t({ fr: 'Observer avant de construire', en: 'Observe before building' }),
      body: t({
        fr: 'Sur le terrain, une question revenait : pourquoi envoyer de l’argent devait-il encore demander autant d’explications, de confiance et de patience ?',
        en: 'In the field, one question kept coming back: why should sending money still require so much explanation, trust, and patience?',
      }),
    },
    {
      year: t({ fr: 'Le virage', en: 'The turn' }),
      title: t({ fr: 'De la finance-comptabilité à la tech', en: 'From finance & accounting to tech' }),
      body: t({
        fr: 'Avec une formation en finance-comptabilité, notre fondateur a appris à regarder les chiffres, les risques et les détails. Puis il a choisi de mettre cette rigueur au service d’un produit numérique utile.',
        en: 'With a background in finance and accounting, our founder learned to look at numbers, risk, and detail. Then he chose to put that discipline behind a useful digital product.',
      }),
    },
    {
      year: t({ fr: 'Aujourd’hui', en: 'Today' }),
      title: t({ fr: 'Relier les réseaux, rapprocher les personnes', en: 'Connect networks, bring people closer' }),
      body: t({
        fr: 'SendFlow transforme la complexité des réseaux Mobile Money en un parcours simple : choisir, vérifier, envoyer. Une petite interface, pour une grande liberté de mouvement.',
        en: 'SendFlow turns Mobile Money network complexity into a simple journey: choose, review, send. A small interface for a greater freedom of movement.',
      }),
    },
  ];

  const benefits = [
    t({ fr: 'Comprendre chaque étape avant de confirmer', en: 'Understand every step before confirming' }),
    t({ fr: 'Passer d’un réseau à l’autre sans jargon', en: 'Move between networks without jargon' }),
    t({ fr: 'Garder une trace claire de chaque transfert', en: 'Keep a clear record of every transfer' }),
    t({ fr: 'Envoyer avec une confiance construite dans les détails', en: 'Send with confidence built into the details' }),
  ];

  return (
    <main className="about-page min-h-[100dvh]" style={{ backgroundColor: colors.ivory, color: colors.navy }}>
      <div className="about-appbar">
        <button type="button" onClick={onBackHome} aria-label={t({ fr: 'Retour', en: 'Back' })}>
          <ArrowLeft size={20} />
        </button>
        <span>{t({ fr: 'Découvrir SendFlow', en: 'Discover SendFlow' })}</span>
        <button type="button" onClick={() => window.location.reload()} aria-label={t({ fr: 'Actualiser la page', en: 'Refresh page' })}>
          <RefreshCw size={19} />
        </button>
      </div>
      <header className="about-site-header">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 px-5 py-3 sm:gap-4 sm:px-8 lg:px-12">
          <button
            type="button"
            onClick={onBackHome}
            className="group order-1 inline-flex items-center gap-3 text-left"
            aria-label={t({ fr: 'Retour à l’accueil', en: 'Back home' })}
          >
            <Mark />
            <span className="text-sm font-bold tracking-[-0.03em]">SendFlow</span>
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="order-3 ml-auto inline-flex min-h-10 items-center gap-2 rounded-2xl bg-[#6d35d8] px-3.5 py-2 text-[11px] font-bold text-white shadow-[0_6px_16px_rgba(109,53,216,.22)] transition-colors hover:bg-[#5822c3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d35d8] sm:px-4 sm:text-xs md:ml-0"
          >
            <Download size={15} aria-hidden="true" />
            <span className="sm:hidden">{t({ fr: 'Télécharger', en: 'Download' })}</span>
            <span className="hidden sm:inline">{t({ fr: 'Télécharger l’application', en: 'Download the app' })}</span>
          </button>
          {onChangeLocale && (
            <div
              role="group"
              aria-label={isFrench ? 'Choisir la langue' : 'Choose language'}
              className="order-2 inline-flex shrink-0 items-center gap-0.5 rounded-full border bg-white p-0.5 shadow-[0_4px_12px_rgba(23,36,62,.05)] md:order-4"
              style={{ borderColor: colors.line }}
            >
              <button
                type="button"
                onClick={() => onChangeLocale('fr')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[#f4f0ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#6d35d8]"
                style={{ backgroundColor: isFrench ? colors.violetPale : 'transparent' }}
                aria-label="Français"
                aria-pressed={isFrench}
                lang="fr"
                title="Français"
                data-testid="about-language-fr"
              >
                <LocaleFlag locale="fr" />
              </button>
              <button
                type="button"
                onClick={() => onChangeLocale('en')}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-[#f4f0ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#6d35d8]"
                style={{ backgroundColor: isFrench ? 'transparent' : colors.violetPale }}
                aria-label="English"
                aria-pressed={!isFrench}
                lang="en"
                title="English"
                data-testid="about-language-en"
              >
                <LocaleFlag locale="en" />
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="about-document-hero">
        <div className="rise mx-auto w-full max-w-[880px]">
            <div className={sectionKicker} style={{ color: colors.violet }}>
              <Sparkles size={14} />
              {t({ fr: 'Présentation de SendFlow', en: 'Introducing SendFlow' })}
            </div>
            <h1 className="about-document-page-title max-w-4xl font-serif text-[clamp(2.15rem,4.8vw,3.1rem)] leading-[1.08] tracking-[-0.045em]" style={{ color: colors.navy }}>
              {t({ fr: 'Découvrir SendFlow', en: 'Discover SendFlow' })}
            </h1>
            <p className="about-document-copy about-document-lead mt-5" style={{ color: colors.navySoft }}>
              {t({
                fr: 'SendFlow est né d’une intuition simple : la technologie financière ne devrait pas ajouter de distance. Elle devrait rendre les liens plus directs, les choix plus lisibles et les transferts plus humains.',
                en: 'SendFlow was born from a simple intuition: financial technology should not add distance. It should make connections more direct, choices clearer, and transfers more human.',
              })}
            </p>

          <div
            role="group"
            aria-roledescription={isFrench ? 'carrousel' : 'carousel'}
            aria-label={isFrench ? 'Portraits illustratifs SendFlow' : 'Illustrative SendFlow portraits'}
            onMouseEnter={() => setHeroHoverPaused(true)}
            onMouseLeave={() => setHeroHoverPaused(false)}
            onFocusCapture={() => setHeroFocusPaused(true)}
            onBlurCapture={(event) => {
              if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) {
                setHeroFocusPaused(false);
              }
            }}
            className="about-document-carousel relative mx-auto flex min-h-[300px] w-full max-w-[390px] items-center justify-center"
            data-testid="about-hero-carousel"
          >
            <div className="float-art relative h-[235px] w-[225px] overflow-hidden rounded-[14px] bg-white shadow-[0_12px_32px_rgba(23,36,62,.09)] sm:h-[275px] sm:w-[260px]">
              <ProtectedImage
                key={activeHeroSlide.id}
                src={heroImageFailed ? ABOUT_HERO_ASSETS[0].src : activeHeroSlide.src}
                alt={activeHeroSlide.alt}
                className="h-full w-full object-cover object-[center_20%] transition-opacity duration-500"
                onError={() => setHeroImageFailed(true)}
                data-testid="about-hero-carousel-image"
              />
            </div>
            {resolvedHeroSlides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => goToHeroSlide(heroSlideIndex - 1)}
                  className="absolute left-[2%] top-[43%] z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-white bg-white/95 text-[#6d35d8] shadow-[0_12px_22px_rgba(23,36,62,.14)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d35d8] sm:left-[5%]"
                  aria-label={isFrench ? 'Portrait précédent' : 'Previous portrait'}
                  data-testid="about-hero-carousel-previous"
                >
                  <ArrowLeft size={19} />
                </button>
                <button
                  type="button"
                  onClick={() => goToHeroSlide(heroSlideIndex + 1)}
                  className="absolute right-[5%] top-[16%] z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#6d35d8] text-white shadow-[0_12px_22px_rgba(109,53,216,.24)] transition-transform hover:-translate-y-0.5 hover:bg-[#5822c3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d35d8] sm:right-[12%] sm:top-[13%]"
                  aria-label={isFrench ? 'Portrait suivant' : 'Next portrait'}
                  data-testid="about-hero-carousel-next"
                >
                  <ArrowRight size={21} />
                </button>
                <div className="absolute bottom-1 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#e5ddf2] bg-white/95 px-2.5 py-1.5 shadow-[0_8px_18px_rgba(23,36,62,.1)]">
                  <div role="group" aria-label={isFrench ? 'Choisir un portrait' : 'Choose a portrait'} className="flex items-center gap-1.5">
                    {resolvedHeroSlides.map((slide, index) => (
                      <button
                        key={slide.id}
                        type="button"
                        onClick={() => goToHeroSlide(index)}
                        className={`h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d35d8] ${heroSlideIndex === index ? 'w-5 bg-[#6d35d8]' : 'w-2 bg-[#cfc4e4] hover:bg-[#6d35d8]'}`}
                        aria-label={isFrench ? `Afficher le portrait ${index + 1}` : `Show portrait ${index + 1}`}
                        aria-current={heroSlideIndex === index ? 'true' : undefined}
                        data-testid={`about-hero-carousel-dot-${index + 1}`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setHeroAutoRotateEnabled((enabled) => !enabled)}
                    disabled={prefersReducedMotion}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[#6d35d8] transition-colors hover:bg-[#f4f0ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#6d35d8] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={
                      prefersReducedMotion
                        ? (isFrench ? 'Défilement automatique désactivé par le réglage de mouvement réduit' : 'Automatic rotation disabled by reduced motion preference')
                        : heroAutoRotateEnabled
                          ? (isFrench ? 'Mettre le défilement automatique en pause' : 'Pause automatic rotation')
                          : (isFrench ? 'Reprendre le défilement automatique' : 'Resume automatic rotation')
                    }
                    aria-pressed={heroAutoRotateEnabled && !prefersReducedMotion}
                    data-testid="about-hero-carousel-toggle"
                  >
                    {heroAutoRotateEnabled && !prefersReducedMotion ? <Pause size={13} /> : <Play size={13} />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section id="mission" className="about-document-section">
        <AboutSectionHeading
          number="I."
          title={t({ fr: 'Notre raison d’être', en: 'Our reason for being' })}
          illustration={crossNetworkIcon}
          illustrationAlt={t({ fr: 'Illustration de réseaux de paiement connectés', en: 'Illustration of connected payment networks' })}
        />
        <p className="about-document-copy about-document-lead">
          {t({ fr: 'Rendre la simplicité accessible à tous.', en: 'Make simplicity accessible to everyone.' })}
        </p>
        <div className="about-document-columns">
          <article>
            <h3><span>01</span> {t({ fr: 'Notre mission', en: 'Our mission' })}</h3>
            <p className="about-document-copy">{profile.mission}</p>
          </article>
          <article>
            <h3><span>02</span> {t({ fr: 'Notre vision', en: 'Our vision' })}</h3>
            <p className="about-document-copy">{profile.vision}</p>
          </article>
        </div>
        <AboutLongform section="mission" locale={locale} />
      </section>

      <section className="about-document-section">
        <AboutSectionHeading
          number="II."
          title={t({ fr: 'Le chemin de SendFlow', en: 'The SendFlow journey' })}
          illustration={aboutHeroHandshake}
          illustrationAlt={t({ fr: 'Illustration de collaboration autour de SendFlow', en: 'Illustration of collaboration around SendFlow' })}
        />
        <p className="about-document-copy about-document-lead">
          {t({
            fr: 'Pas de raccourci spectaculaire. Un apprentissage patient : écouter, comprendre les contraintes, puis construire quelque chose qui tient.',
            en: 'No spectacular shortcut. A patient practice: listen, understand the constraints, then build something that holds.',
          })}
        </p>
        <div className="about-document-timeline">
          {storySteps.map((step) => (
            <article key={step.year}>
              <p className="about-document-eyebrow">{step.year}</p>
              <h3>{step.title}</h3>
              <p className="about-document-copy">{step.body}</p>
            </article>
          ))}
        </div>
        <AboutLongform section="journey" locale={locale} />
      </section>

      <section className="about-document-section">
        <AboutSectionHeading
          number="III."
          title={t({ fr: 'Ce que SendFlow rend possible', en: 'What SendFlow makes possible' })}
          illustration={internationalTransferIcon}
          illustrationAlt={t({ fr: 'Illustration d’un transfert entre réseaux', en: 'Illustration of a transfer between networks' })}
        />
        <p className="about-document-copy about-document-lead">
          {t({ fr: 'Moins de friction. Plus de mouvement.', en: 'Less friction. More movement.' })}
        </p>
        <div className="about-document-feature-list">
          <Feature
            title={t({ fr: 'Un seul point de départ', en: 'One starting point' })}
            description={t({
              fr: 'Choisissez un pays, un réseau et un bénéficiaire depuis un parcours pensé pour être compris du premier coup.',
              en: 'Choose a country, a network, and a recipient through a journey designed to be understood at first glance.',
            })}
          />
          <Feature
            title={t({ fr: 'Une confiance lisible', en: 'Trust you can read' })}
            description={t({
              fr: 'Les informations essentielles restent visibles : qui reçoit, combien, quand et où en est le transfert.',
              en: 'The essentials stay visible: who receives, how much, when, and where the transfer stands.',
            })}
          />
          <Feature
            title={t({ fr: 'Des frontières moins lourdes', en: 'Lighter borders' })}
            description={t({
              fr: 'SendFlow rapproche les réseaux locaux pour que la distance géographique ne dicte plus la distance humaine.',
              en: 'SendFlow brings local networks closer so geography does not dictate human distance.',
            })}
          />
        </div>
        <AboutLongform section="possibilities" locale={locale} />
      </section>

      <section className="about-document-section">
        <AboutSectionHeading
          number="IV."
          title={t({ fr: 'Le bénéfice au quotidien', en: 'The everyday benefit' })}
          illustration={visibleDetailsIcon}
          illustrationAlt={t({ fr: 'Illustration d’informations de transfert clairement présentées', en: 'Illustration of clearly presented transfer information' })}
        />
        <p className="about-document-copy about-document-lead">
          {t({ fr: 'Une technologie qui s’efface quand elle fait bien son travail.', en: 'Technology that disappears when it does its job well.' })}
        </p>
        <ul className="about-document-benefits">
            {benefits.map((benefit) => (
              <li key={benefit} className="about-document-copy">
                <span aria-hidden="true">•</span> {benefit}
              </li>
            ))}
        </ul>
        <AboutLongform section="everyday" locale={locale} />
      </section>

      <section id="founder" className="about-document-section">
        <AboutSectionHeading
          number="V."
          title={t({ fr: 'À l’origine de SendFlow', en: 'At the origin of SendFlow' })}
        />
        <p className="about-document-copy about-document-lead">{profile.shortBio}</p>

        <div className="about-document-founder">
          <div className="about-document-founder-photo">
            <FounderPhoto profile={profile} />
          </div>
          <div className="about-document-founder-copy">
            <div>
              <Quote size={28} style={{ color: colors.violet }} />
              <blockquote className="about-document-copy mt-6 max-w-2xl font-serif text-lg leading-[1.68] tracking-normal" style={{ color: colors.navy }}>
                “{profile.story}”
              </blockquote>
              <div className="mt-8">
                <h3 className="text-xl font-bold tracking-[-0.03em]">{profile.name}</h3>
                <p className="mt-1 text-sm" style={{ color: colors.violet }}>{profile.role}</p>
                <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: colors.navySoft }}>
                  <GraduationCap size={15} />
                  {profile.education}
                </div>
              </div>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-3 pt-6 sm:justify-start">
              {profile.linkedinUrl && (
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors hover:bg-[#f4f0ff]"
                  style={{ borderColor: colors.line, color: colors.navy }}
                >
                  <Linkedin size={16} />
                  LinkedIn
                </a>
              )}
              {profile.websiteUrl && (
                <a
                  href={profile.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors hover:bg-[#f4f0ff]"
                  style={{ borderColor: colors.line, color: colors.navy }}
                >
                  <Globe2 size={16} />
                  Site
                </a>
              )}
              {profile.instagramUrl && (
                <a
                  href={profile.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors hover:bg-[#f4f0ff]"
                  style={{ borderColor: colors.line, color: colors.navy }}
                >
                  <Instagram size={16} />
                  Instagram
                </a>
              )}
              {profile.xUrl && (
                <a
                  href={profile.xUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-colors hover:bg-[#f4f0ff]"
                  style={{ borderColor: colors.line, color: colors.navy }}
                >
                  <span className="text-sm font-black leading-none">X</span>
                  X
                </a>
              )}
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="inline-flex min-w-[214px] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-transform hover:-translate-y-0.5"
                  style={{ backgroundColor: colors.violet, color: colors.paper }}
                >
                  <SiGmail size={18} color="#EA4335" aria-hidden="true" />
                  {t({ fr: 'Écrire au fondateur', en: 'Email the founder' })}
                </a>
              )}
              {contactPhoneHref && (
                <a
                  href={contactPhoneHref}
                  className="inline-flex min-w-[214px] items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-transform hover:-translate-y-0.5"
                  style={{ borderColor: colors.line, color: colors.navy }}
                >
                  {contactPhone}
                </a>
              )}
              {contactWhatsappHref && (
                <a
                  href={contactWhatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-w-[214px] items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition-transform hover:-translate-y-0.5"
                  style={{ borderColor: colors.line, color: colors.navy }}
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
        <AboutLongform section="founder" locale={locale} />
      </section>

      <footer className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-5 pb-8 pt-2 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12" style={{ color: colors.navySoft }}>
        <div className="flex items-center gap-2">
          <Mark className="h-7 w-7 text-[10px]" />
          <span>SendFlow · {t({ fr: 'Des liens qui avancent.', en: 'Connections in motion.' })}</span>
        </div>
        <span>{t({ fr: 'Une initiative Flow Digital SARL.', en: 'An initiative by Flow Digital SARL.' })}</span>
      </footer>
    </main>
  );
}

export default AboutPage;