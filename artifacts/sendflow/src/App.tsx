import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactElement } from 'react';
import { Link, Route, Switch, Router as WouterRouter, useLocation, useRoute } from 'wouter';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowDownRight, ArrowRight, Check, ChevronDown, ChevronRight, Globe2, LockKeyhole, Menu, Play, Sparkles, X } from 'lucide-react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSeo } from '@/lib/seo';
import publicSeoRoutes from '@/lib/public-seo-routes.json';
import { getLocaleFromPath, getLocalizedPath } from '@/lib/localized-routes';
import { takePanelCredentialsFromUrl, type PanelCredentials } from '@/lib/panelAccess';
import { getActiveLandingCountries, type LandingCountryView } from '@/lib/landingCountries';
import NotFound from '@/pages/not-found';
import AdminPage from '@/pages/admin';
import AboutPage, { type FounderProfile } from '@/pages/about';
import { LegalMentionsPage, PrivacyPage, TermsPage, type LegalPageProps } from '@/pages/legal';
import { EditableLegalPage } from '@/pages/editable-legal';
import DownloadPage from '@/pages/download';
import FeaturesPage from '@/pages/features';
import SecurityPage from '@/pages/security';
import CorridorGuidePage from '@/pages/corridor-guide';
import { SendFlowFooter } from '@/components/sendflow-footer';
import DeveloperApiCard from '@/components/DeveloperApiCard';
import FeatureActionCards from '@/components/FeatureActionCards';
import OperatorFeesSection from '@/components/OperatorFeesSection';
import { developerApiExample } from '@/lib/developer-api-example';
import { OPERATOR_FEES_CONTENT_KEY, parseOperatorFeesConfig } from '@/lib/operator-fees';
import {
  getRegistrationUrl,
  REGISTRATION_CTA_DEFAULT_LABELS,
  REGISTRATION_CTA_LABEL_KEY,
  REGISTRATION_CTA_URL_KEY,
} from '@/lib/registration-cta';
import { ProtectedImage } from '@/components/protected-image';
import sendflowMark from '@assets/sendflow-mark-original.png';
import sendflowWordmark from '@assets/sendflow-wordmark-original.png';
import heroPlaceholder from '@assets/generated_images/sendflow-hero-placeholder.png';
import heroGlobe from '@assets/generated_images/sendflow-earth-globe-transparent.png';
import heroWomanConnection from '@assets/generated_images/sendflow-hero-woman.webp';
import heroWomanCutout from '@assets/generated_images/sendflow-hero-woman-cutout.webp';
import networkSectionArt from '@assets/generated_images/sendflow-section-network-3d-transparent.png';
import howItWorksSectionArt from '@assets/generated_images/sendflow-section-how-it-works-3d-transparent.png';
import internationalSectionArt from '@assets/generated_images/sendflow-section-international-3d-transparent.png';
import securitySectionArt from '@assets/generated_images/sendflow-section-security-3d-transparent.png';
import securityGuardianArt from '@assets/generated_images/sendflow-security-guardian-3d-transparent.png';
import coverageSectionArt from '@assets/generated_images/sendflow-section-coverage-3d-transparent.png';
import downloadSectionArt from '@assets/generated_images/sendflow-section-download-3d-transparent.png';
import networkPersonArt from '@assets/generated_images/sendflow-network-person-3d-transparent.png';
import howPersonArt from '@assets/generated_images/sendflow-how-person-3d-transparent.png';
import internationalPersonArt from '@assets/generated_images/sendflow-international-person-3d-transparent.png';
import coveragePersonArt from '@assets/generated_images/sendflow-coverage-person-3d-transparent.png';
import downloadPersonArt from '@assets/generated_images/sendflow-download-person-3d-transparent.png';
import chooseStepArt from '@assets/generated_images/sendflow-step-choose-3d-transparent.png';
import checkStepArt from '@assets/generated_images/sendflow-step-check-3d-transparent.png';
import sendStepArt from '@assets/generated_images/sendflow-step-send-3d-transparent.png';
import operatorLogosTicker from '@assets/operator-logos_(1)_1789039877510.png';
import orangeOperatorLogo from './assets/operator-logos/operator-logo-01.png';
import moovOperatorLogo from './assets/operator-logos/operator-logo-02.png';
import waveOperatorLogo from './assets/operator-logos/operator-logo-03.png';
import airtelOperatorLogo from './assets/operator-logos/operator-logo-04.png';
import momoMtnOperatorLogo from './assets/operator-logos/operator-logo-momo-mtn.png';
import freeOperatorLogo from './assets/operator-logos/operator-logo-07.png';
import mixxOperatorLogo from './assets/operator-logos/operator-logo-08.png';
import mpesaOperatorLogo from './assets/operator-logos/operator-logo-09.png';
import celtiisOperatorLogo from './assets/operator-logos/celtiis-official.svg';
import camtelOperatorLogo from './assets/operator-logos/camtel-official.png';
import telecelOperatorLogo from './assets/operator-logos/telecel-user-provided.png';
import africellOperatorLogo from './assets/operator-logos/africell-official-white.png';
import qcellOperatorLogo from './assets/operator-logos/qcell-official.png';
import comiumOperatorLogo from './assets/operator-logos/comium-official.svg';
import chinguitelOperatorLogo from './assets/operator-logos/chinguitel-official.png';
import mauritelOperatorLogo from './assets/operator-logos/mauritel-official.svg';
import gloOperatorLogo from './assets/operator-logos/glo-official.png';
import telkomKenyaOperatorLogo from './assets/operator-logos/telkom-kenya-official.png';
import safaricomOperatorLogo from './assets/operator-logos/safaricom-user-provided.png';
import cellcomOperatorLogo from './assets/operator-logos/cellcom-user-provided.png';
import zamaniOperatorLogo from './assets/operator-logos/zamani-user-provided.png';
import mattelOperatorLogo from './assets/operator-logos/mattel-user-provided.png';
import nineMobileOperatorLogo from './assets/operator-logos/9mobile-user-provided.png';
import expressoOperatorLogo from './assets/operator-logos/expresso-user-provided.png';
import atOperatorLogo from './assets/operator-logos/at-user-provided.png';
import cvMovelOperatorLogo from './assets/operator-logos/cvmovel-user-provided.png';
import unitelTPlusOperatorLogo from './assets/operator-logos/unitel-t-plus-user-provided.png';
import crossNetworkIcon from './assets/sendflow-icon-cross-network.svg';
import internationalIcon from './assets/sendflow-icon-international-transfer.svg';
import trackingIcon from './assets/sendflow-icon-transaction-tracking.svg';
import simpleExperienceIcon from './assets/sendflow-icon-simple-experience.svg';
import visibleDetailsIcon from './assets/sendflow-icon-visible-details.svg';
import privateIcon from './assets/sendflow-icon-private.svg';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
function consumePanelCredentials(): PanelCredentials | null {
  const result = takePanelCredentialsFromUrl(new URL(window.location.href));
  if (result.sanitizedUrl !== window.location.href) {
    window.history.replaceState(window.history.state, '', result.sanitizedUrl);
  }
  return result.credentials;
}
let initialPanelCredentials = consumePanelCredentials();

type Language = 'fr' | 'en';
type Copy = { fr: string; en: string };
let activePublicContent: PublicLandingBundle['content'] | undefined;
const publicEditorialFallbacks: Record<string, Copy> = {
  'nav.home': { fr: 'Accueil', en: 'Home' },
  'nav.features': { fr: 'Fonctionnalités', en: 'Features' },
  'nav.how': { fr: 'Comment ça marche', en: 'How it works' },
  'nav.developer': { fr: 'Développeur', en: 'Developer' },
  'nav.security': { fr: 'Sécurité', en: 'Security' },
  'nav.about': { fr: 'À propos', en: 'About' },
  'cta.download': { fr: 'Télécharger l’application', en: 'Download the app' },
  'cta.discover': { fr: 'Découvrir SendFlow', en: 'Discover SendFlow' },
  'cta.newsletter': { fr: 'Me tenir au courant', en: 'Keep me posted' },
  'cta.newsletter.note': { fr: 'Démo uniquement · Aucun engagement', en: 'Demo only · No commitment' },
  'features.principles.kicker': { fr: 'Une expérience, trois repères', en: 'One experience, three principles' },
  'features.principles.title': { fr: 'Pensé pour une Afrique connectée.', en: 'Built for a connected Africa.' },
  'security.title': { fr: 'Chaque étape\nà découvert.', en: 'Every step,\nin the clear.' },
  'security.body': { fr: 'Le calme vient de ce que l’on comprend. SendFlow rend les détails lisibles, les choix explicites et le contrôle toujours à portée de main.', en: 'Calm comes from understanding. SendFlow makes details readable, choices explicit, and control always within reach.' },
  'security.visible.title': { fr: 'Détails visibles', en: 'Visible details' },
  'security.visible.body': { fr: 'Comprendre avant de confirmer.', en: 'Understand before you confirm.' },
  'security.private.title': { fr: 'Pensé privé', en: 'Privacy-minded' },
  'security.private.body': { fr: 'Moins de données, plus de sérénité.', en: 'Less data, more peace of mind.' },
  'cta.nextMove': { fr: 'Le prochain mouvement', en: 'The next move' },
  'cta.download.title': { fr: 'Votre prochain transfert\ncommence ici.', en: 'Your next transfer\nstarts here.' },
  'cta.download.body': { fr: 'Téléchargez bientôt l’application SendFlow et simplifiez vos transferts entre réseaux.', en: 'Download the SendFlow app soon and simplify transfers across networks.' },
};
const t = (copy: Copy, language: Language) => {
  const key = Object.entries(publicEditorialFallbacks).find(([, fallback]) => fallback.fr === copy.fr && fallback.en === copy.en)?.[0];
  const override = key ? activePublicContent?.find((item) => item.contentKey === key && item.locale === language && item.isVisible)?.value : undefined;
  return override ?? copy[language];
};
const contentCopy = (
  content: PublicLandingBundle['content'] | undefined,
  key: string,
  fallback: Copy,
): Copy => ({
  fr: content?.find((item) => item.contentKey === key && item.locale === 'fr' && item.isVisible)?.value ?? fallback.fr,
  en: content?.find((item) => item.contentKey === key && item.locale === 'en' && item.isVisible)?.value ?? fallback.en,
});
type PublicLandingBundle = {
  content: Array<{ contentKey: string; locale: string; value: string; isVisible: boolean }>;
  sections: Array<{ slug: string; kind: string; orderIndex: number; titleFr: string; titleEn: string; bodyFr: string | null; bodyEn: string | null; imageKey: string | null; isVisible: boolean }>;
  features: Array<{ slug: string; group: string; titleFr: string; titleEn: string; bodyFr: string; bodyEn: string; iconKey: string | null; isVisible: boolean }>;
  faqs: Array<{ questionFr: string; questionEn: string; answerFr: string; answerEn: string; isVisible: boolean }>;
  countries: Array<{ id: number; code: string; nameFr: string; nameEn: string; flag: string; tone: string; heroPositionX: number | null; heroPositionY: number | null; isVisible: boolean }>;
  operators: Array<{ id: number; slug: string; name: string; logoKey: string | null; background: string | null; foreground: string | null; isVisible: boolean }>;
  countryOperators: Array<{ countryId: number; operatorId: number; orderIndex: number }>;
  globeBadges: Array<{ operatorId: number; positionX: number; positionY: number; orderIndex: number; isVisible: boolean }>;
  media: Array<{ slug: string; publicUrl: string | null; storagePath: string | null; sourcePath: string; isVisible: boolean }>;
  legalPages: Array<{ id: number; slug: string; titleFr: string; titleEn: string; introFr: string; introEn: string; isVisible: boolean }>;
  legalSections: Array<{ id: number; pageId: number; sectionNumber: number; titleFr: string; titleEn: string; bodyFr: string; bodyEn: string; orderIndex: number }>;
  founder: {
    id: number;
    name: string;
    roleFr: string;
    roleEn: string;
    shortBioFr: string;
    shortBioEn: string;
    storyFr: string;
    storyEn: string;
    visionFr: string;
    visionEn: string;
    educationFr: string;
    educationEn: string;
    missionFr: string;
    missionEn: string;
    photoKey: string | null;
    linkedinUrl: string | null;
    websiteUrl: string | null;
    instagramUrl: string | null;
    xUrl: string | null;
    email: string | null;
    isVisible: boolean;
  } | null;
  settings: {
    id: number;
    supportEmail: string;
    supportPhone: string | null;
    websiteUrl: string | null;
    linkedinUrl: string | null;
    instagramUrl: string | null;
    facebookUrl: string | null;
    whatsappUrl: string | null;
    homeContactEmail: string | null;
    homeContactPhone: string | null;
    homeContactWhatsapp: string | null;
    featuresContactEmail: string | null;
    featuresContactPhone: string | null;
    featuresContactWhatsapp: string | null;
    securityContactEmail: string | null;
    securityContactPhone: string | null;
    securityContactWhatsapp: string | null;
    downloadContactEmail: string | null;
    downloadContactPhone: string | null;
    downloadContactWhatsapp: string | null;
    aboutContactEmail: string | null;
    aboutContactPhone: string | null;
    aboutContactWhatsapp: string | null;
    legalContactEmail: string | null;
    legalContactPhone: string | null;
    legalContactWhatsapp: string | null;
    companyName: string;
    legalForm: string;
    legalAddress: string;
    legalEmail: string;
    footerAddressFlag: string;
    footerAddressCountry: string;
    footerAddress: string;
    regulatorNameFr: string;
    regulatorNameEn: string;
    regulatorLogoKey: string | null;
    googlePlayUrl: string | null;
    appStoreUrl: string | null;
    apkUrl: string | null;
  } | null;
};

const fallbackFounder: Record<Language, FounderProfile> = {
  fr: {
    name: 'Fondateur de SendFlow',
    role: 'Fondateur & CEO',
    shortBio: 'Un profil finance-comptabilité devenu bâtisseur de produits numériques, avec une conviction : la technologie doit clarifier les mouvements d’argent.',
    story: 'Je viens de la finance-comptabilité, un univers qui apprend à regarder les chiffres, les risques et les détails. En me lançant dans la tech, j’ai voulu transformer cette rigueur en une expérience concrète : aider les personnes à envoyer de l’argent entre réseaux sans se perdre dans la complexité.',
    vision: 'Faire de chaque transfert un parcours compréhensible, fiable et ouvert, où les réseaux rapprochent les personnes au lieu de créer de nouvelles frontières.',
    mission: 'Connecter les réseaux de paiement et les personnes qui les utilisent, sans imposer la complexité technique à ceux qui veulent simplement aider, recevoir ou avancer.',
    education: 'Formation en finance-comptabilité · Côte d’Ivoire',
    email: 'hello@sendflow.studio',
  },
  en: {
    name: 'SendFlow Founder',
    role: 'Founder & CEO',
    shortBio: 'A finance and accounting profile turned digital product builder, with one conviction: technology should make money movement clearer.',
    story: 'I come from finance and accounting, a world that teaches you to look at numbers, risk, and detail. Moving into tech, I wanted to turn that discipline into a concrete experience: helping people send money across networks without getting lost in complexity.',
    vision: 'Make every transfer understandable, reliable, and open, so networks bring people closer instead of creating new borders.',
    mission: 'Connect payment networks and the people who use them, without placing technical complexity on those who simply want to help, receive, or move forward.',
    education: 'Finance & accounting background · Côte d’Ivoire',
    email: 'hello@sendflow.studio',
  },
};

function BrandLockup() {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-[#6d35d8]/20">
        <ProtectedImage src={sendflowMark} alt="" className="h-7 w-6 object-contain" />
      </span>
      <ProtectedImage src={sendflowWordmark} alt="SendFlow" className="h-5 w-auto object-contain" />
    </span>
  );
}

function BrandedCharacter({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <div className={`relative flex min-w-0 items-end justify-center ${className}`}>
      <ProtectedImage src={src} alt={alt} className="h-40 w-full object-contain sm:h-52" />
      <span className="absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-[#6d35d8]/20 bg-white px-2.5 py-1.5 shadow-[0_8px_18px_rgba(80,40,170,.16)]">
        <ProtectedImage src={sendflowMark} alt="" className="h-4 w-4 object-contain" />
        <ProtectedImage src={sendflowWordmark} alt="SendFlow" className="h-3.5 w-auto object-contain" />
      </span>
    </div>
  );
}

const navItems = [
  { id: 'top', label: { fr: 'Accueil', en: 'Home' } },
  { id: 'features-cards', label: { fr: 'Fonctionnalités', en: 'Features' } },
  { id: 'how', label: { fr: 'Comment ça marche', en: 'How it works' } },
  { id: 'developer-api', label: { fr: 'Développeur', en: 'Developer' } },
  { id: 'security', label: { fr: 'Sécurité', en: 'Security' } },
  { id: 'about', label: { fr: 'À propos', en: 'About' } },
];

const fallbackCountries = [
  { name: 'Côte d’Ivoire', code: 'CI', networks: ['Orange', 'MTN', 'Moov Africa', 'Wave'], flag: '🇨🇮', tone: '#dbeaff' },
  { name: 'Bénin', code: 'BJ', networks: ['MTN', 'Moov Africa'], flag: '🇧🇯', tone: '#dbeaff' },
  { name: 'Togo', code: 'TG', networks: ['T-Money', 'Moov Africa'], flag: '🇹🇬', tone: '#dbeaff' },
  { name: 'Cameroun', code: 'CM', networks: ['MTN', 'Orange'], flag: '🇨🇲', tone: '#dbeaff' },
  { name: 'Burkina Faso', code: 'BF', networks: ['Orange', 'Moov Africa', 'Wave', 'Telecel Faso'], flag: '🇧🇫', tone: '#dbeaff' },
  { name: 'Cap-Vert', code: 'CV', networks: ['CVMóvel', 'Unitel T+'], flag: '🇨🇻', tone: '#dbeaff' },
  { name: 'Gambie', code: 'GM', networks: ['Africell', 'QCell', 'Comium'], flag: '🇬🇲', tone: '#dbeaff' },
  { name: 'Guinée', code: 'GN', networks: ['Orange', 'MTN', 'Cellcom'], flag: '🇬🇳', tone: '#dbeaff' },
  { name: 'Guinée-Bissau', code: 'GW', networks: ['Orange', 'MTN'], flag: '🇬🇼', tone: '#dbeaff' },
  { name: 'Liberia', code: 'LR', networks: ['Lonestar Cell MTN', 'Orange', 'Africell'], flag: '🇱🇷', tone: '#dbeaff' },
  { name: 'Mali', code: 'ML', networks: ['Orange', 'Moov Africa', 'Telecel Mali'], flag: '🇲🇱', tone: '#dbeaff' },
  { name: 'Mauritanie', code: 'MR', networks: ['Mauritel', 'Mattel', 'Chinguitel'], flag: '🇲🇷', tone: '#dbeaff' },
  { name: 'Niger', code: 'NE', networks: ['Airtel', 'Moov Africa', 'Zamani Telecom'], flag: '🇳🇪', tone: '#dbeaff' },
  { name: 'Nigeria', code: 'NG', networks: ['MTN', 'Airtel', 'Glo', '9mobile'], flag: '🇳🇬', tone: '#dbeaff' },
  { name: 'Sierra Leone', code: 'SL', networks: ['Africell', 'Orange', 'QCell'], flag: '🇸🇱', tone: '#dbeaff' },
  { name: 'Sénégal', code: 'SN', networks: ['Orange', 'Free', 'Moov Africa', 'Expresso', 'Wave'], flag: '🇸🇳', tone: '#dbeaff' },
  { name: 'Ghana', code: 'GH', networks: ['MTN', 'Telecel', 'AT'], flag: '🇬🇭', tone: '#dbeaff' },
  { name: 'Gabon', code: 'GA', networks: ['Airtel', 'Moov Africa'], flag: '🇬🇦', tone: '#dbeaff' },
  { name: 'Kenya', code: 'KE', networks: ['Safaricom', 'Airtel', 'Telkom'], flag: '🇰🇪', tone: '#dbeaff' },
];
const fallbackHeroFlagPositions: Record<string, { x: number; y: number }> = {
  CI: { x: 5, y: 55 },
  BJ: { x: 6, y: 25 },
  TG: { x: 6, y: 78 },
  BF: { x: 3, y: 40 },
  GH: { x: 88, y: 13 },
  SN: { x: 89, y: 41 },
  NG: { x: 84, y: 70 },
  GN: { x: 63, y: 88 },
  CM: { x: 34, y: 88 },
  GA: { x: 17, y: 88 },
};
const countries = fallbackCountries.map((country) => ({
  ...country,
  heroPositionX: fallbackHeroFlagPositions[country.code]?.x ?? null,
  heroPositionY: fallbackHeroFlagPositions[country.code]?.y ?? null,
}));
type OperatorLogo = { mark: string; background: string; foreground: string; image?: string; imageBackground?: string; wide?: boolean };

const operatorLogoMarks: Record<string, OperatorLogo> = {
  Orange: { mark: '', background: '#ff7900', foreground: '#ffffff', image: orangeOperatorLogo },
  MTN: { mark: 'MTN', background: '#ffca05', foreground: '#17131f', image: momoMtnOperatorLogo },
  'Moov Africa': { mark: 'moov', background: '#e83e8c', foreground: '#ffffff', image: moovOperatorLogo },
  Wave: { mark: '⌁', background: '#1769ff', foreground: '#ffffff', image: waveOperatorLogo },
  Celtiis: { mark: 'C', background: '#1a9c75', foreground: '#ffffff', image: celtiisOperatorLogo },
  Togocom: { mark: 'T', background: '#e22d39', foreground: '#ffffff', image: mixxOperatorLogo },
  'T-Money': { mark: 'T-Money', background: '#1553a5', foreground: '#ffffff', image: mixxOperatorLogo },
  Camtel: { mark: 'C', background: '#0b5fa5', foreground: '#ffffff', image: camtelOperatorLogo },
  AT: { mark: 'AT', background: '#ffffff', foreground: '#17131f', image: atOperatorLogo, wide: true },
  CVMóvel: { mark: 'CV', background: '#5bb9bb', foreground: '#ffffff', image: cvMovelOperatorLogo },
  'Unitel T+': { mark: 'T+', background: '#182b68', foreground: '#ffffff', image: unitelTPlusOperatorLogo, wide: true },
  Nexttel: { mark: 'N', background: '#e52936', foreground: '#ffffff' },
  Telecel: { mark: 'T', background: '#e32526', foreground: '#ffffff', image: telecelOperatorLogo },
  'Telecel Faso': { mark: 'T', background: '#ed1c24', foreground: '#ffffff', image: telecelOperatorLogo },
  'Telecel Mali': { mark: 'T', background: '#e32526', foreground: '#ffffff', image: telecelOperatorLogo },
  Airtel: { mark: 'airtel', background: '#e4002b', foreground: '#ffffff', image: airtelOperatorLogo },
  Vodafone: { mark: 'V', background: '#e60000', foreground: '#ffffff' },
  Africell: { mark: 'a', background: '#e40046', foreground: '#ffffff', image: africellOperatorLogo, imageBackground: '#211d2c' },
  QCell: { mark: 'Q', background: '#008c44', foreground: '#ffffff', image: qcellOperatorLogo },
  Comium: { mark: 'C', background: '#f58220', foreground: '#ffffff', image: comiumOperatorLogo },
  Cellcom: { mark: 'C', background: '#0055a4', foreground: '#ffffff', image: cellcomOperatorLogo },
  'Lonestar Cell MTN': { mark: 'MTN', background: '#ffca05', foreground: '#17131f', image: momoMtnOperatorLogo },
  Expresso: { mark: 'E', background: '#6d5bd0', foreground: '#ffffff', image: expressoOperatorLogo },
  Mauritel: { mark: 'M', background: '#008dba', foreground: '#ffffff', image: mauritelOperatorLogo },
  Mattel: { mark: 'M', background: '#e2001a', foreground: '#ffffff', image: mattelOperatorLogo },
  Chinguitel: { mark: 'C', background: '#00a8a8', foreground: '#ffffff', image: chinguitelOperatorLogo },
  'Zamani Telecom': { mark: 'Z', background: '#ef7d00', foreground: '#ffffff', image: zamaniOperatorLogo, wide: true },
  Glo: { mark: 'G', background: '#78be20', foreground: '#ffffff', image: gloOperatorLogo },
  '9mobile': { mark: '9', background: '#005b45', foreground: '#ffffff', image: nineMobileOperatorLogo },
  Safaricom: { mark: 'S', background: '#00a651', foreground: '#ffffff', image: safaricomOperatorLogo, wide: true },
  Telkom: { mark: 'T', background: '#0072bc', foreground: '#ffffff', image: telkomKenyaOperatorLogo, imageBackground: '#211d2c' },
  MoMo: { mark: 'MoMo', background: '#1b65a7', foreground: '#ffffff', image: momoMtnOperatorLogo },
  Free: { mark: 'Free', background: '#111827', foreground: '#ffffff', image: freeOperatorLogo },
  'M-Pesa': { mark: 'M-Pesa', background: '#f2f2f2', foreground: '#17131f', image: mpesaOperatorLogo },
};

const feeOperatorLogoBySlug: Partial<Record<string, OperatorLogo>> = {
  orange: operatorLogoMarks.Orange,
  mtn: operatorLogoMarks.MTN,
  'moov-africa': operatorLogoMarks['Moov Africa'],
  wave: operatorLogoMarks.Wave,
};

function PublicOperatorFees({
  bundle,
  language,
}: {
  bundle: PublicLandingBundle | undefined;
  language: 'fr' | 'en';
}) {
  if (!bundle) return null;

  const feeContent = bundle.content.find((item) =>
    item.contentKey === OPERATOR_FEES_CONTENT_KEY && item.locale === 'fr' && item.isVisible,
  );
  const feeConfig = parseOperatorFeesConfig(feeContent?.value);
  if (!feeConfig) return null;

  const ratesBySlug = new Map(feeConfig.operators.map((operator) => [operator.slug, operator]));
  const ivoryCoast = bundle.countries.find((country) => country.code === 'CI' && country.isVisible);
  if (!ivoryCoast) return null;
  const ivoryCoastOperatorIds = new Set(
    bundle.countryOperators
      .filter((assignment) => assignment.countryId === ivoryCoast.id)
      .map((assignment) => assignment.operatorId),
  );
  const visibleOperators = bundle.operators.filter((operator) =>
    operator.isVisible && ivoryCoastOperatorIds.has(operator.id),
  );
  if (visibleOperators.some((operator) => !ratesBySlug.has(operator.slug))) return null;

  const operators = visibleOperators
    .map((operator) => {
      const rate = ratesBySlug.get(operator.slug);
      const logo = operator.logoKey
        ? bundle.media.find((item) => item.slug === operator.logoKey && item.isVisible)
        : undefined;
      const fallbackLogo = feeOperatorLogoBySlug[operator.slug];
      return {
        slug: operator.slug,
        name: operator.name,
        logoUrl: logo?.publicUrl ?? fallbackLogo?.image ?? null,
        background: operator.background ?? fallbackLogo?.background ?? null,
        foreground: operator.foreground ?? fallbackLogo?.foreground ?? null,
        collectionPercent: rate?.collectionPercent ?? 0,
        transferPercent: rate?.transferPercent ?? 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, language));

  return (
    <OperatorFeesSection
      language={language}
      config={{
        collectionTitle: language === 'fr' ? feeConfig.collectionTitleFr : feeConfig.collectionTitleEn,
        transferTitle: language === 'fr' ? feeConfig.transferTitleFr : feeConfig.transferTitleEn,
        bankTransferLabel: language === 'fr' ? feeConfig.bankTransferLabelFr : feeConfig.bankTransferLabelEn,
        bankTransferAmountXof: feeConfig.bankTransferAmountXof,
        operators,
      }}
    />
  );
}

function OperatorRow({
  network,
  operator,
  media,
}: {
  network: string;
  operator?: PublicLandingBundle['operators'][number];
  media?: PublicLandingBundle['media'];
}) {
  const fallbackLogo = operatorLogoMarks[network] ?? { mark: network.slice(0, 1).toUpperCase(), background: '#6d35d8', foreground: '#ffffff' };
  const mediaLogo = operator?.logoKey ? media?.find((item) => item.slug === operator.logoKey && item.isVisible)?.publicUrl : null;
  const logo = {
    ...fallbackLogo,
    background: operator?.background || fallbackLogo.background,
    foreground: operator?.foreground || fallbackLogo.foreground,
    image: mediaLogo || fallbackLogo.image,
  };
  return (
    <div className="flex items-center justify-center">
      <span role="img" aria-label={`${network} logo`} className={`flex ${logo.wide ? 'h-12 w-[76px]' : 'h-14 w-14 sm:h-16 sm:w-16'} items-center justify-center shadow-[0_8px_18px_rgba(58,38,83,.08)] ${logo.image ? 'rounded-2xl border border-[#dbe5f2] bg-white p-2' : 'rounded-full'}`} style={logo.image ? { backgroundColor: logo.imageBackground || '#ffffff' } : { backgroundColor: logo.background, color: logo.foreground }}>
        {logo.image ? <ProtectedImage src={logo.image} alt="" className={`${logo.wide ? 'max-h-8' : 'max-h-full'} max-w-full object-contain`} /> : network === 'Orange' ? <span className="h-3 w-6 bg-white" aria-hidden="true" /> : <span className="text-[10px] font-extrabold tracking-[-.04em]">{logo.mark}</span>}
      </span>
    </div>
  );
}

const faqs: { q: Copy; a: Copy }[] = [
  { q: { fr: 'Qu’est-ce que SendFlow ?', en: 'What is SendFlow?' }, a: { fr: 'SendFlow simplifie les transferts d’argent entre réseaux Mobile Money avec un parcours clair, rapide et lisible.', en: 'SendFlow simplifies money transfers between Mobile Money networks with a clear, fast, and easy-to-follow journey.' } },
  { q: { fr: 'Quels réseaux sont disponibles ?', en: 'Which networks are available?' }, a: { fr: 'La couverture SendFlow réunit les principaux opérateurs disponibles dans les pays couverts. Sélectionnez un pays pour découvrir ses réseaux.', en: 'SendFlow coverage brings together the main operators available in supported countries. Select a country to explore its networks.' } },
  { q: { fr: 'Puis-je transférer vers un autre pays ?', en: 'Can I transfer to another country?' }, a: { fr: 'Oui. SendFlow est conçu pour relier les réseaux locaux et faciliter les transferts internationaux lorsque les conditions locales le permettent.', en: 'Yes. SendFlow is designed to connect local networks and simplify international transfers where local conditions allow.' } },
  { q: { fr: 'Comment suivre un transfert ?', en: 'How do I track a transfer?' }, a: { fr: 'SendFlow affiche chaque étape, de la vérification à la confirmation, avec un statut lisible pour le bénéficiaire et l’expéditeur.', en: 'SendFlow shows every step from review to confirmation, with a clear status for sender and recipient.' } },
  { q: { fr: 'SendFlow possède-t-il un wallet ?', en: 'Does SendFlow have a wallet?' }, a: { fr: 'Oui. SendFlow possède un wallet.', en: 'Yes. SendFlow has a wallet.' } },
  { q: { fr: 'L’API développeur SendFlow est-elle disponible ?', en: 'Is the SendFlow developer API available?' }, a: { fr: 'Oui. Les développeurs peuvent connecter leurs applications aux services SendFlow grâce à l’API.', en: 'Yes. Developers can connect their applications to SendFlow services through the API.' } },
];

function StoreLogo({ icon }: { icon: 'play' | 'apple' }) {
  if (icon === 'play') {
    return (
      <svg viewBox="0 0 32 32" className="h-10 w-10 shrink-0" aria-hidden="true">
        <path d="M4.5 3.8C3.6 4.7 3 6.1 3 7.8v16.4c0 1.7.6 3.1 1.5 4l14-14.2L4.5 3.8Z" fill="#00A0FF" />
        <path d="m18.5 14 4.2-4.3 4.8 2.7c1.5.9 1.5 2.5 0 3.4l-4.8 2.7-4.2-4.5Z" fill="#FFD900" />
        <path d="M4.5 3.8 18.5 18l4.2-4.3L7.2 2.3c-1-.5-2-.1-2.7 1.5Z" fill="#FF3A44" />
        <path d="M4.5 28.2 18.5 14l4.2 4.5-15.5 8.9c-1 .5-2 .1-2.7-1.5Z" fill="#00C86F" />
      </svg>
    );
  }

  if (icon === 'apple') {
    return (
      <svg viewBox="0 0 32 32" className="h-10 w-10 shrink-0" aria-hidden="true">
        <path d="M21.2 16.8c0-3 2.5-4.5 2.6-4.6-1.4-2.1-3.7-2.4-4.5-2.4-1.9-.2-3.7 1.1-4.7 1.1-1 0-2.5-1.1-4.1-1-2.1 0-4.1 1.2-5.2 3.1-2.2 3.8-.6 9.4 1.5 12.5 1 1.5 2.3 3.2 3.9 3.1 1.6-.1 2.2-1 4.1-1 1.9 0 2.4 1 4.1.9 1.7 0 2.8-1.5 3.8-3 1.2-1.7 1.7-3.4 1.7-3.5-.1 0-3.2-1.2-3.2-5.2Z" fill="currentColor" />
        <path d="M18.2 7.9c.9-1.1 1.5-2.6 1.3-4.1-1.3.1-2.9.9-3.8 2-.8.9-1.5 2.5-1.3 3.9 1.5.1 2.9-.7 3.8-1.8Z" fill="currentColor" />
      </svg>
    );
  }

  return null;
}

function StoreBadge({ store, icon, soonLabel, href, className = '' }: { store: string; icon: 'play' | 'apple'; soonLabel?: string; href?: string | null; className?: string }) {
  const badge = (
    <div className={`sendflow-store-badge ${className}`} aria-label={`Disponible sur ${store}`}>
      <span className="sendflow-store-logo-tile" aria-hidden="true">
        <StoreLogo icon={icon} />
      </span>
      <span>
        <small>{icon === 'play' ? 'DISPONIBLE SUR' : 'Télécharger sur'}</small>
        <strong>{store}{soonLabel && <em className="sendflow-store-soon"> · {soonLabel}</em>}</strong>
      </span>
    </div>
  );
  return href ? <a href={href} target="_blank" rel="noreferrer">{badge}</a> : badge;
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AnimatedRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </WouterRouter>
  );
}

type RouteMotionSettings = { direction: -1 | 0 | 1; reduced: boolean };

const routeMotionVariants: Variants = {
  enter: ({ direction, reduced }: RouteMotionSettings) => ({
    opacity: reduced ? 1 : 0,
    x: reduced || direction === 0 ? 0 : direction * 26,
    y: reduced ? 0 : 8,
  }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.42, ease: 'easeOut' },
  },
  exit: ({ direction, reduced }: RouteMotionSettings) => ({
    opacity: reduced ? 1 : 0,
    x: reduced || direction === 0 ? 0 : direction * -20,
    y: reduced ? 0 : -4,
    transition: { duration: 0.22, ease: 'easeIn' },
  }),
};

const routeOrder = [
  '/',
  '/fonctionnalites',
  '/securite',
  '/a-propos',
  '/france-senegal',
  '/download',
  '/conditions-utilisation',
  '/confidentialite',
  '/mentions-legales',
];

function getRouteMotionIndex(path: string) {
  const normalized = path.replace(/\/+$/, '').toLowerCase() || '/';
  const localizedPaths: Record<string, string> = {
    '/en': '/',
    '/en/features': '/fonctionnalites',
    '/en/security': '/securite',
    '/en/about': '/a-propos',
    '/en/france-senegal': '/france-senegal',
    '/en/download': '/download',
    '/en/terms': '/conditions-utilisation',
    '/en/privacy': '/confidentialite',
    '/en/legal-notice': '/mentions-legales',
  };
  const canonicalPath = localizedPaths[normalized] ?? normalized;
  return routeOrder.indexOf(canonicalPath);
}

function AnimatedRoutes() {
  const [location] = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const previousLocation = useRef(location);
  const previousIndex = getRouteMotionIndex(previousLocation.current);
  const nextIndex = getRouteMotionIndex(location);
  const direction: RouteMotionSettings['direction'] =
    previousIndex < 0 || nextIndex < 0 || previousIndex === nextIndex
      ? 0
      : nextIndex > previousIndex
        ? 1
        : -1;
  const motionSettings = { direction, reduced: Boolean(prefersReducedMotion) };

  useEffect(() => {
    if (previousLocation.current === location) return;
    previousLocation.current = location;
    if (!window.location.hash) window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location]);

  return (
    <AnimatePresence mode="wait" custom={motionSettings}>
      <motion.div
        key={location}
        className="sendflow-route-transition"
        custom={motionSettings}
        variants={routeMotionVariants}
        initial="enter"
        animate="center"
        exit="exit"
      >
        <Switch>
          <Route path="/" component={LandingPage} />
          <Route path="/download" component={DownloadPage} />
          <Route path="/fonctionnalites" component={FeaturesPage} />
          <Route path="/securite" component={SecurityPage} />
          <Route path="/a-propos" component={AboutRoute} />
          <Route path="/conditions-utilisation" component={() => <PublicLegalRoute page={TermsPage} slug="conditions-utilisation" />} />
          <Route path="/confidentialite" component={() => <PublicLegalRoute page={PrivacyPage} slug="confidentialite" />} />
          <Route path="/mentions-legales" component={() => <PublicLegalRoute page={LegalMentionsPage} slug="mentions-legales" />} />
          <Route path="/france-senegal" component={CorridorGuidePage} />
          <Route path="/en/*?" component={EnglishPublicRoute} />
          <Route path="/admin" component={LegacyAdminRedirect} />
          <Route path="/admin/*" component={LegacyAdminRedirect} />
          <Route path="/panel" component={PanelRoute} />
          <Route component={NotFoundRoute} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function EnglishPublicRoute() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/en/';
  if (path === '/en' || path === '/en/') return <LandingPage />;
  if (path === '/en/features') return <FeaturesPage />;
  if (path === '/en/security') return <SecurityPage />;
  if (path === '/en/download') return <DownloadPage />;
  if (path === '/en/about') return <AboutRoute />;
  if (path === '/en/terms') return <PublicLegalRoute page={TermsPage} slug="conditions-utilisation" />;
  if (path === '/en/privacy') return <PublicLegalRoute page={PrivacyPage} slug="confidentialite" />;
  if (path === '/en/legal-notice') return <PublicLegalRoute page={LegalMentionsPage} slug="mentions-legales" />;
  if (path === '/en/france-senegal') return <CorridorGuidePage />;
  return <NotFoundRoute />;
}

function PublicLegalRoute({ page: Page, slug }: { page: (props: LegalPageProps) => ReactElement; slug: string }) {
  const locale = getLocaleFromPath(window.location.pathname);
  const { data } = usePublicLandingBundle();
  const legalPage = data?.legalPages?.find((item) => item.slug === slug && item.isVisible);
  const legalSections = data?.legalSections?.filter((item) => item.pageId === legalPage?.id).sort((a, b) => a.orderIndex - b.orderIndex) ?? [];
  const fallbackTitles: Record<string, { fr: string; en: string }> = {
    'conditions-utilisation': {
      fr: publicSeoRoutes.terms.fr.name,
      en: publicSeoRoutes.terms.en.name,
    },
    confidentialite: {
      fr: publicSeoRoutes.privacy.fr.name,
      en: publicSeoRoutes.privacy.en.name,
    },
    'mentions-legales': {
      fr: publicSeoRoutes.legalNotice.fr.name,
      en: publicSeoRoutes.legalNotice.en.name,
    },
  };
  const legalTitle = locale === 'fr'
    ? legalPage?.titleFr || fallbackTitles[slug]?.fr || 'Informations légales'
    : legalPage?.titleEn || fallbackTitles[slug]?.en || 'Legal information';
  useSeo({
    path: `/${slug}`,
    locale,
    title: `${legalTitle} · SendFlow`,
    description: locale === 'fr' ? legalPage?.introFr || `${legalTitle} de SendFlow.` : legalPage?.introEn || `${legalTitle} by SendFlow.`,
    breadcrumbs: [{ name: locale === 'fr' ? 'Accueil' : 'Home', path: '/' }, { name: legalTitle, path: `/${slug}` }],
  });
  if (legalPage && legalSections.length > 0) {
    return <EditableLegalPage page={legalPage} sections={legalSections} settings={data?.settings ? {
      companyName: data.settings.companyName,
      legalForm: data.settings.legalForm,
      legalAddress: data.settings.legalAddress,
      legalEmail: data.settings.legalEmail || data.settings.supportEmail,
      contactEmail: data.settings.legalContactEmail || data.settings.legalEmail || data.settings.supportEmail,
      contactPhone: data.settings.legalContactPhone,
      whatsappNumber: data.settings.legalContactWhatsapp,
    } : null} />;
  }
  return <Page
    supportEmail={data?.settings?.supportEmail ?? null}
    legalEmail={data?.settings?.legalContactEmail || data?.settings?.legalEmail || null}
    legalAddress={data?.settings?.legalAddress ?? null}
    contactPhone={data?.settings?.legalContactPhone ?? null}
    whatsappNumber={data?.settings?.legalContactWhatsapp ?? null}
  />;
}

function usePublicLandingBundle() {
  return useQuery<PublicLandingBundle>({
    queryKey: ['/api/landing'],
    queryFn: async () => {
      const response = await fetch('/api/landing');
      if (!response.ok) throw new Error('Landing content unavailable');
      return response.json() as Promise<PublicLandingBundle>;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

function AboutRoute() {
  const [, navigate] = useLocation();
  const [language] = useState<Language>(() => getLocaleFromPath(window.location.pathname));
  const { data: landingBundle } = usePublicLandingBundle();

  const profile = useMemo<FounderProfile>(() => {
    const fallback = fallbackFounder[language];
    const founder = landingBundle?.founder;
    if (!founder || founder.isVisible === false) return fallback;
    const photoUrl = founder.photoKey
      ? landingBundle.media.find((media) => media.slug === founder.photoKey && media.isVisible)?.publicUrl ?? null
      : null;
    return language === 'fr'
      ? {
        name: founder.name,
        role: founder.roleFr,
        photoUrl,
        shortBio: founder.shortBioFr,
        story: founder.storyFr,
        vision: founder.visionFr,
        mission: founder.missionFr,
        education: founder.educationFr,
        linkedinUrl: founder.linkedinUrl?.trim() || null,
        websiteUrl: founder.websiteUrl?.trim() || null,
        instagramUrl: founder.instagramUrl?.trim() || null,
        xUrl: founder.xUrl?.trim() || null,
        email: founder.email?.trim() || null,
      }
      : {
        name: founder.name,
        role: founder.roleEn,
        photoUrl,
        shortBio: founder.shortBioEn,
        story: founder.storyEn,
        vision: founder.visionEn,
        mission: founder.missionEn,
        education: founder.educationEn,
        linkedinUrl: founder.linkedinUrl?.trim() || null,
        websiteUrl: founder.websiteUrl?.trim() || null,
        instagramUrl: founder.instagramUrl?.trim() || null,
        xUrl: founder.xUrl?.trim() || null,
        email: founder.email?.trim() || null,
      };
  }, [language, landingBundle]);

  useSeo({
    path: '/a-propos',
    locale: language,
    title: publicSeoRoutes.about[language].title,
    description: publicSeoRoutes.about[language].description,
    breadcrumbs: [{ name: language === 'fr' ? 'Accueil' : 'Home', path: '/' }, { name: language === 'fr' ? 'À propos' : 'About', path: '/a-propos' }],
  });

  return (
    <AboutPage
      locale={language}
      profile={profile}
      content={landingBundle?.content ?? []}
      heroSlides={landingBundle?.sections.filter((section) => section.kind === 'about-hero-slide') ?? []}
      media={landingBundle?.media ?? []}
      contact={{
        email: landingBundle?.settings?.aboutContactEmail,
        phone: landingBundle?.settings?.aboutContactPhone,
        whatsapp: landingBundle?.settings?.aboutContactWhatsapp,
      }}
      onBackHome={() => navigate(getLocalizedPath('/', language))}
      onDownload={() => navigate(getLocalizedPath('/download', language))}
      onChangeLocale={(nextLocale) => navigate(getLocalizedPath(window.location.pathname, nextLocale))}
    />
  );
}

function LegacyAdminRedirect() {
  useSeo({
    path: '/admin',
    locale: 'fr',
    title: 'Administration · SendFlow',
    description: 'Espace d’administration SendFlow.',
    robots: 'noindex,nofollow',
  });
  useEffect(() => {
    window.location.replace(`${basePath}/`);
  }, []);
  return null;
}

function NotFoundRoute() {
  useSeo({
    path: '/404',
    locale: 'fr',
    title: 'Page introuvable · SendFlow',
    description: 'La page demandée est introuvable.',
    robots: 'noindex,nofollow',
  });
  return <NotFound />;
}

function PanelUrlRequired() {
  return (
    <div className="sendflow-admin-auth">
      <div className="sendflow-admin-auth-card">
        <div className="mb-4 flex items-center gap-2 px-1 text-sm font-bold text-[#6d35d8]">
          <LockKeyhole className="text-[#1769ff]" size={19} />
          Accès privé requis
        </div>
        <p className="text-sm leading-6 text-[#667386]">
          Ouvrez le lien d’administration sécurisé qui vous a été remis.
        </p>
      </div>
    </div>
  );
}

function PanelRoute() {
  useSeo({
    path: '/panel',
    locale: 'fr',
    title: 'Espace privé · SendFlow',
    description: 'Espace privé SendFlow.',
    robots: 'noindex,nofollow',
  });
  const token = initialPanelCredentials?.token ?? '';
  const email = initialPanelCredentials?.email ?? '';
  const panelAccess = useQuery<{ user: { id: number; email: string } }>({
    queryKey: ['admin-panel-access'],
    queryFn: async () => {
      const response = await fetch('/api/admin/auth/panel/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email }),
      });
      if (!response.ok) throw new Error('Panel not found');
      return response.json();
    },
    enabled: Boolean(token && email),
    retry: false,
  });

  if (!token || !email) return <AdminRoute panelToken="" adminEmail="" panelEmail="" />;
  if (panelAccess.isPending) {
    return <div className="flex min-h-[100dvh] items-center justify-center bg-[#f6f8fb] text-sm text-[#667386]">Vérification de l’URL privée…</div>;
  }
  if (panelAccess.isError) return <PanelUrlRequired />;
  return <AdminRoute panelToken={token} adminEmail={panelAccess.data.user.email} panelEmail={email} />;
}

function AdminRoute({ panelToken, adminEmail, panelEmail }: { panelToken: string; adminEmail: string; panelEmail: string }) {
  const adminSession = useQuery<{ user: { id: number; email: string } }>({
    queryKey: ['admin-session'],
    queryFn: async () => {
      const response = await fetch('/api/admin/auth/me', { credentials: 'include' });
      if (!response.ok) throw new Error('Not authenticated');
      return response.json();
    },
    retry: false,
  });
  if (adminSession.isPending) return <div className="flex min-h-[100dvh] items-center justify-center bg-[#f6f8fb] text-sm text-[#667386]">Chargement de la session…</div>;
  if (adminSession.isError) {
    if (!panelToken || !panelEmail) return <PanelUrlRequired />;
    return (
      <div className="sendflow-admin-auth">
        <div className="sendflow-admin-auth-card">
          <div className="mb-4 flex items-center gap-2 px-1 text-sm font-bold text-[#192231]">
            <LockKeyhole className="text-[#1769ff]" size={19} />
            Connexion au panel administrateur
          </div>
          <AdminLoginForm panelToken={panelToken} adminEmail={adminEmail} panelEmail={panelEmail} />
        </div>
      </div>
    );
  }
  return <AdminPage />;
}

function AdminLoginForm({ panelToken, adminEmail, panelEmail }: { panelToken: string; adminEmail: string; panelEmail: string }) {
  const [email, setEmail] = useState(adminEmail);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, password, panelToken, panelEmail }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Email ou mot de passe incorrect.');
      }
      initialPanelCredentials = null;
      queryClient.removeQueries({ queryKey: ['admin-panel-access'] });
      await queryClient.invalidateQueries({ queryKey: ['admin-session'] });
      window.location.assign(`${basePath}/panel`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Email ou mot de passe incorrect.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm leading-6 text-[#667386]">Utilisez le compte administrateur autorisé pour gérer le contenu de SendFlow.</p>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-[#192231]">Email administrateur</span>
          <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
          placeholder="admin@exemple.com"
          className="sendflow-admin-auth-input"
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-[#192231]">Mot de passe unique</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          placeholder="Votre mot de passe"
          className="sendflow-admin-auth-input"
        />
      </label>
      {error && <p role="alert" className="rounded-xl bg-[#fff1f1] px-4 py-3 text-sm font-medium leading-5 text-[#b42318]">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="sendflow-admin-auth-submit"
      >
        {isSubmitting ? 'Connexion…' : 'Se connecter au panel'}
      </button>
    </form>
  );
}

function LandingPage() {
  // Editorial copy is loaded from the public landing bundle.
  const [, navigate] = useLocation();
  const [language] = useState<Language>(() => getLocaleFromPath(window.location.pathname));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<LandingCountryView>(countries[0]);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [email, setEmail] = useState('');
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);
  const [newsletterError, setNewsletterError] = useState<string | null>(null);
  const { data: landingBundle } = usePublicLandingBundle();
  activePublicContent = landingBundle?.content;

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileOpen]);

  const submitNewsletter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewsletterError(null);
    setNewsletterSubmitting(true);
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, consent: newsletterConsent }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || (isFrench ? 'Impossible de vous inscrire pour le moment.' : 'We could not subscribe you right now.'));
      setSubmitted(true);
      setEmail('');
      setNewsletterConsent(false);
    } catch (caught) {
      setNewsletterError(caught instanceof Error ? caught.message : (isFrench ? 'Impossible de vous inscrire pour le moment.' : 'We could not subscribe you right now.'));
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  const activeCountries = useMemo<LandingCountryView[]>(() => {
    return getActiveLandingCountries(landingBundle, language, countries);
  }, [landingBundle, language]);

  const activeFaqs = useMemo(() => (
    landingBundle?.faqs?.filter((faq) => faq.isVisible).map((faq) => ({
      q: { fr: faq.questionFr, en: faq.questionEn },
      a: { fr: faq.answerFr, en: faq.answerEn },
    })) ?? faqs
  ), [landingBundle]);

  const publicNavItems = useMemo(() => {
    const keys: Record<string, string> = {
      top: 'nav.home',
      'features-cards': 'nav.features',
      how: 'nav.how',
      'developer-api': 'nav.developer',
      security: 'nav.security',
      about: 'nav.about',
    };
    return navItems.map((item) => ({ ...item, label: contentCopy(landingBundle?.content, keys[item.id] ?? item.id, item.label) }));
  }, [landingBundle]);

  const localizedSection = (slug: string, fallback: { title: Copy; body: Copy }) => {
    const section = landingBundle?.sections?.find((item) => item.slug === slug && item.isVisible);
    return section
      ? { title: { fr: section.titleFr, en: section.titleEn }, body: { fr: section.bodyFr ?? fallback.body.fr, en: section.bodyEn ?? fallback.body.en } }
      : fallback;
  };

  const featureCopy = (slug: string, fallback: { title: Copy; text: Copy }) => {
    const feature = landingBundle?.features?.find((item) => item.slug === slug && item.isVisible);
    return feature ? { title: { fr: feature.titleFr, en: feature.titleEn }, text: { fr: feature.bodyFr, en: feature.bodyEn } } : fallback;
  };

  const sectionCopy = (slug: string, fallback: Copy): Copy => localizedSection(slug, { title: fallback, body: { fr: '', en: '' } }).title;
  const sectionBody = (slug: string, fallback: Copy): Copy => localizedSection(slug, { title: { fr: '', en: '' }, body: fallback }).body;

  const heroBadges = useMemo(() => {
    const rows = landingBundle?.globeBadges?.filter((badge) => badge.isVisible).sort((a, b) => a.orderIndex - b.orderIndex) ?? [];
    return rows.map((badge) => {
      const operator = landingBundle?.operators.find((item) => item.id === badge.operatorId && item.isVisible);
      return operator ? { operator, position: { left: `${badge.positionX}%`, top: `${badge.positionY}%` } } : null;
    }).filter((item): item is { operator: PublicLandingBundle['operators'][number]; position: { left: string; top: string } } => Boolean(item));
  }, [landingBundle]);

  const remoteFeatures = useMemo(() => {
    const iconMap: Record<string, string> = {
      'icon-cross-network': crossNetworkIcon,
      'icon-international': internationalIcon,
      'icon-tracking': trackingIcon,
      'icon-simple': simpleExperienceIcon,
    };
    const rows = landingBundle?.features?.filter((feature) => feature.group === 'feature' && feature.isVisible);
    return rows?.length ? rows.map((feature) => ({
      title: { fr: feature.titleFr, en: feature.titleEn },
      text: { fr: feature.bodyFr, en: feature.bodyEn },
      icon: iconMap[feature.iconKey ?? ''] ?? crossNetworkIcon,
    })) : [
      { title: { fr: 'Transfert inter-réseaux', en: 'Cross-network transfers' }, text: { fr: 'Reliez les réseaux et intégrez les services SendFlow à vos applications grâce à l’API développeur.', en: 'Connect networks and integrate SendFlow services into your applications with the developer API.' }, icon: crossNetworkIcon },
      { title: { fr: 'Transfert international', en: 'International transfers' }, text: { fr: 'Explorer les chemins possibles entre pays africains, lorsque disponibles.', en: 'Explore possible routes across African countries where available.' }, icon: internationalIcon },
      { title: { fr: 'Suivi des transactions', en: 'Transaction tracking' }, text: { fr: 'Voir où en est chaque étape avant de confirmer.', en: 'See where each step stands before confirming.' }, icon: trackingIcon },
      { title: { fr: 'Expérience simple', en: 'Simple experience' }, text: { fr: 'Moins de friction, plus de confiance dans chaque choix.', en: 'Less friction, more confidence in every choice.' }, icon: simpleExperienceIcon },
    ];
  }, [landingBundle]);

  useEffect(() => {
    const elements = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('reveal-visible');
    }), { threshold: .12 });
    elements.forEach((element) => observer.observe(element));
    const initialAnchor = window.location.hash.slice(1);
    if (initialAnchor) {
      window.setTimeout(() => document.getElementById(initialAnchor)?.scrollIntoView(), 500);
    }
    return () => observer.disconnect();
  }, []);

  const isFrench = language === 'fr';
  const googlePlayUrl = landingBundle?.settings?.googlePlayUrl?.trim() || null;
  const appStoreUrl = landingBundle?.settings?.appStoreUrl?.trim() || null;
  const hasStoreLink = Boolean(googlePlayUrl || appStoreUrl);
  const homeServiceDefaults = publicSeoRoutes.home.service[language];
  const registrationUrl = getRegistrationUrl(
    landingBundle?.content.find((item) => item.contentKey === REGISTRATION_CTA_URL_KEY && item.locale === 'fr' && item.isVisible)?.value,
  );
  const registrationLabel = t(
    contentCopy(landingBundle?.content, REGISTRATION_CTA_LABEL_KEY, REGISTRATION_CTA_DEFAULT_LABELS),
    language,
  );
  useSeo({
    path: '/',
    locale: language,
    title: t(contentCopy(landingBundle?.content, 'seo.home.title', {
      fr: publicSeoRoutes.home.fr.title,
      en: publicSeoRoutes.home.en.title,
    }), language),
    description: t(contentCopy(landingBundle?.content, 'seo.home.description', {
      fr: publicSeoRoutes.home.fr.description,
      en: publicSeoRoutes.home.en.description,
    }), language),
    breadcrumbs: [{ name: isFrench ? 'Accueil' : 'Home', path: '/' }],
    faqItems: activeFaqs.map((faq) => ({ question: faq.q[language], answer: faq.a[language] })),
    application: {
      name: 'SendFlow',
      operatingSystem: 'Android, iOS',
      applicationCategory: 'FinanceApplication',
      downloadUrls: [googlePlayUrl, appStoreUrl].filter((url): url is string => Boolean(url)),
    },
    service: {
      name: homeServiceDefaults.name,
      serviceType: homeServiceDefaults.serviceType,
      areaServed: landingBundle?.countries
        .filter((country) => country.isVisible)
        .map((country) => isFrench ? country.nameFr : country.nameEn) ?? [],
    },
  });
  useEffect(() => {
    const nextCountry = activeCountries.find((country) => country.code === selectedCountry.code) ?? activeCountries[0];
    if (nextCountry && nextCountry.code !== selectedCountry.code) setSelectedCountry(nextCountry);
  }, [activeCountries, selectedCountry.code]);

  const activeSelectedCountry = activeCountries.find((country) => country.code === selectedCountry.code) ?? activeCountries[0] ?? null;
  const displayNetworks = activeSelectedCountry?.networks ?? [];

  const goTo = (id: string) => {
    setMobileOpen(false);
    if (id === 'security') {
      navigate(getLocalizedPath('/securite', language));
      return;
    }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const publicNavHref = (id: string) => {
    if (id === 'features-cards') return '/fonctionnalites';
    if (id === 'security') return '/securite';
    return `#${id}`;
  };

  const downloadBrief = () => {
    const brief = `SendFlow\n\nUne vision plus calme des mouvements d’argent en Afrique.\n\n${activeSelectedCountry ? `Parcours exploré : ${activeSelectedCountry.name}\nOpérateurs : ${activeSelectedCountry.networks.join(', ')}` : 'Aucun pays n’est actuellement affiché.'}\n\nsendflow.studio`;
    const blob = new Blob([brief], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'sendflow-brief.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="noise min-h-[100dvh] bg-[#f7f3e9] text-[#211d2c]">
      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-8 sm:pt-6">
        <nav className="mx-auto flex max-w-[1240px] items-center justify-between rounded-full border border-[#2d2535]/10 bg-[#f7f3e9]/85 px-4 py-3 backdrop-blur-md sm:px-5">
          <button onClick={() => goTo('top')} className="flex items-center gap-2" data-testid="button-logo">
            <BrandLockup />
          </button>
          <div className="hidden items-center gap-7 min-[1280px]:flex">
            {publicNavItems.map((item) => {
              const href = getLocalizedPath(publicNavHref(item.id), language);
              const className = "link-underline text-[13px] font-medium text-[#5e5766] transition-colors hover:text-[#6d35d8]";
              return href.startsWith('#')
                ? <a key={item.id} href={href} onClick={() => setMobileOpen(false)} className={className} data-testid={`link-nav-${item.id}`}>{t(item.label, language)}</a>
                : <Link key={item.id} href={href} onClick={() => setMobileOpen(false)} className={className} data-testid={`link-nav-${item.id}`}>{t(item.label, language)}</Link>;
            })}
          </div>
          <div className="hidden items-center gap-3 min-[1280px]:flex">
            <button onClick={() => navigate(getLocalizedPath(window.location.pathname, isFrench ? 'en' : 'fr'))} className="flex items-center gap-1 rounded-full px-2 py-2 text-[12px] font-semibold text-[#5e5766] hover:text-[#6d35d8]" data-testid="button-language">{isFrench ? 'EN' : 'FR'} <Globe2 size={14} /></button>
            <a
              href={registrationUrl ?? undefined}
              onClick={(event) => {
                if (!registrationUrl) event.preventDefault();
              }}
              aria-disabled={!registrationUrl}
              role={registrationUrl ? undefined : 'link'}
              title={!registrationUrl ? 'Configurez l’URL d’inscription dans le panneau admin.' : undefined}
              className="rounded-full bg-[#211d2c] px-4 py-2.5 text-[12px] font-semibold !text-white transition-transform hover:-translate-y-0.5"
              data-testid="button-nav-register"
            >
              {registrationLabel} <ArrowRight className="ml-1 inline" size={14} />
            </a>
          </div>
          <button type="button" onClick={downloadBrief} className="hidden items-center gap-1 rounded-full px-2 py-2 text-[11px] font-semibold text-[#6d35d8] min-[1280px]:flex" data-testid="button-download-brief">{isFrench ? 'Brief' : 'Brief'} <ArrowDownRight size={13} /></button>
          <button
            className="sf-public-nav-trigger min-[1280px]:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label={isFrench ? 'Ouvrir le menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="sf-public-mobile-navigation"
            data-testid="button-open-menu"
            type="button"
          >
            <Menu size={20} />
          </button>
        </nav>
      </header>

      {mobileOpen && (
        <div
          className="sf-public-nav-backdrop min-[1280px]:hidden"
          onClick={() => setMobileOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMobileOpen(false);
          }}
          role="presentation"
        >
          <aside
            id="sf-public-mobile-navigation"
            className="sf-public-nav-panel"
            onClick={(event) => event.stopPropagation()}
            aria-label={isFrench ? 'Menu principal' : 'Main menu'}
            aria-modal="true"
            role="dialog"
          >
            <div className="sf-public-nav-top">
              <BrandLockup />
              <button
                onClick={() => setMobileOpen(false)}
                className="sf-public-nav-close"
                aria-label={isFrench ? 'Fermer le menu' : 'Close menu'}
                data-testid="button-close-menu"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="sf-public-nav-intro">
              <p>{isFrench ? 'Navigation' : 'Navigation'}</p>
              <h2>{isFrench ? 'Explorer SendFlow' : 'Explore SendFlow'}</h2>
            </div>

            <nav
              className="sf-public-nav-links"
              aria-label={isFrench ? 'Navigation principale' : 'Main navigation'}
            >
              {publicNavItems.map((item) => {
                const href = getLocalizedPath(publicNavHref(item.id), language);
                const className = 'sf-public-nav-link';
                const content = (
                  <>
                    <span>{t(item.label, language)}</span>
                    <ChevronRight aria-hidden="true" size={17} className="sf-public-nav-link-arrow" />
                  </>
                );
                return href.startsWith('#')
                  ? <a key={item.id} href={href} onClick={() => setMobileOpen(false)} className={className} aria-current={item.id === 'top' ? 'page' : undefined} data-testid={`link-mobile-${item.id}`}>{content}</a>
                  : <Link key={item.id} href={href} onClick={() => setMobileOpen(false)} className={className} aria-current={item.id === 'top' ? 'page' : undefined} data-testid={`link-mobile-${item.id}`}>{content}</Link>;
              })}
            </nav>

            <div className="sf-public-nav-footer">
              <button
                onClick={() => {
                  navigate(getLocalizedPath(window.location.pathname, isFrench ? 'en' : 'fr'));
                  setMobileOpen(false);
                }}
                className="sf-public-nav-language"
                data-testid="button-mobile-language"
                type="button"
              >
                <span>{isFrench ? 'Langue' : 'Language'}</span>
                <strong><Globe2 size={15} aria-hidden="true" />{isFrench ? 'English' : 'Français'}</strong>
              </button>
              <a
                href={registrationUrl ?? undefined}
                onClick={(event) => {
                  if (!registrationUrl) {
                    event.preventDefault();
                    return;
                  }
                  setMobileOpen(false);
                }}
                aria-disabled={!registrationUrl}
                role={registrationUrl ? undefined : 'link'}
                title={!registrationUrl ? 'Configurez l’URL d’inscription dans le panneau admin.' : undefined}
                className="sf-public-nav-cta"
                data-testid="button-mobile-register"
              >
                {registrationLabel}
                <ArrowRight aria-hidden="true" size={16} />
              </a>
            </div>
          </aside>
        </div>
      )}

      <main id="top">
        <section className="relative overflow-hidden px-5 pb-10 pt-36 sm:px-8 sm:pb-16 sm:pt-44">
          <div className="absolute -right-32 top-24 h-[430px] w-[430px] rounded-full bg-[#d4f0e9] opacity-70 blur-3xl" />
          <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[.95fr_1.05fr] lg:gap-10">
            <div className="relative z-10 max-w-[680px] lg:pr-4">
              <div className="rise relative mb-7 aspect-[1.45/1] w-full max-w-[640px] overflow-hidden rounded-[34px] border border-[#6d35d8]/10 bg-white shadow-[0_22px_55px_rgba(75,44,180,.1)] lg:hidden" data-testid="hero-image-slot">
                <ProtectedImage src={heroPlaceholder} alt={isFrench ? 'Illustration temporaire du passage entre plusieurs réseaux' : 'Temporary illustration of a path across multiple networks'} className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                  <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-[#6d35d8]/15 bg-white/90 px-3 py-2 shadow-[0_8px_20px_rgba(50,30,130,.1)] backdrop-blur-sm">
                    <BrandLockup />
                  </div>
                   {activeCountries.filter((country) => country.heroPositionX !== null && country.heroPositionY !== null).map((country) => <div key={country.code} className="absolute flex items-center gap-1 rounded-full border border-white/80 bg-white/95 px-2 py-1 text-[10px] font-bold text-[#211d2c] shadow-[0_8px_18px_rgba(20,30,80,.12)]" style={{ left: `${country.heroPositionX}%`, top: `${country.heroPositionY}%` }}><span className="text-sm leading-none">{country.flag}</span><span className="hidden sm:inline">{country.name}</span></div>)}
                </div>
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <span className="hero-globe-spin block h-32 w-32 sm:h-48 sm:w-48">
                    <ProtectedImage src={heroGlobe} alt={isFrench ? 'Terre centrée sur l’Afrique' : 'Earth centered on Africa'} className="h-full w-full object-contain drop-shadow-[0_10px_16px_rgba(20,50,150,.22)]" />
                  </span>
                </div>
              </div>
              <h1 className="rise delay-1 mt-6 max-w-[760px] whitespace-pre-line text-[clamp(3.7rem,9vw,7.6rem)] font-extrabold leading-[.88] tracking-[-.09em] text-[#17131f] lg:mt-0 lg:text-[clamp(3.8rem,6.4vw,6.6rem)] lg:leading-[.92] lg:tracking-[-.075em]">{t(localizedSection('hero', { title: { fr: 'L’argent circule.\nLes réseaux aussi.', en: 'Money moves.\nNetworks do too.' }, body: { fr: '', en: '' } }).title, language)}</h1>
               <p className="rise delay-2 mt-8 max-w-[520px] text-[17px] font-semibold leading-7 text-[#30283b] sm:text-[19px] lg:mt-6">{t(localizedSection('hero', { title: { fr: '', en: '' }, body: { fr: 'SendFlow simplifie les transferts entre réseaux, localement et au-delà des frontières. Son API développeur permet d’intégrer ses services à vos applications.', en: 'SendFlow simplifies cross-network transfers, locally and across borders. Its developer API lets you integrate SendFlow services into your applications.' } }).body, language)}</p>
              <div className="rise delay-3 mt-9 flex w-full max-w-[520px] flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center">
                   <a
                    href={registrationUrl ?? undefined}
                    onClick={(event) => {
                      if (!registrationUrl) event.preventDefault();
                    }}
                    aria-disabled={!registrationUrl}
                    role={registrationUrl ? undefined : 'link'}
                    title={!registrationUrl ? 'Configurez l’URL d’inscription dans le panneau admin.' : undefined}
                    className="inline-flex min-h-[52px] whitespace-nowrap items-center justify-center rounded-[14px] border-2 border-[#8b62e5] bg-[#6d35d8] px-5 py-3.5 text-sm font-bold !text-white shadow-[0_12px_24px_rgba(109,53,216,.2)] transition-all hover:-translate-y-1 hover:bg-[#5822c3] hover:!text-white sm:min-w-[210px]"
                    data-testid="button-hero-register"
                  >
                    {registrationLabel} <ArrowRight className="ml-2" size={15} />
                  </a>
                  <Link href={getLocalizedPath('/a-propos', language)} className="inline-flex min-h-[52px] whitespace-nowrap items-center justify-center rounded-[14px] border-2 border-[#8b62e5] bg-[#6d35d8] px-5 py-3.5 text-sm font-bold !text-white shadow-[0_12px_24px_rgba(109,53,216,.2)] transition-all hover:-translate-y-1 hover:bg-[#5822c3] hover:!text-white sm:min-w-[210px]" data-testid="button-hero-discover"><Play className="mr-2 text-white" size={14} fill="currentColor" />{t(contentCopy(landingBundle?.content, 'cta.discover', { fr: 'Découvrir SendFlow', en: 'Discover SendFlow' }), language)}</Link>
              </div>
            </div>
              <div className="relative mx-auto aspect-[3/2] w-full max-w-[530px] overflow-hidden rounded-[28px] border border-[#6d35d8]/15 bg-white shadow-[0_22px_45px_rgba(75,44,180,.14)] lg:aspect-[4/3] lg:max-w-[600px]">
                <ProtectedImage
                  src={heroWomanConnection}
                  alt={isFrench ? 'Femme avec son téléphone devant un globe connecté entre l’Afrique et l’Europe' : 'Woman with her phone in front of a globe connecting Africa and Europe'}
                  className="h-full w-full object-cover"
               />
                  <div className="pointer-events-none absolute left-3 top-3 z-30 flex origin-top-left scale-[0.76] items-center rounded-full border border-[#6d35d8]/20 bg-white/90 px-3 py-2 shadow-[0_8px_20px_rgba(50,30,130,.16)] backdrop-blur-sm sm:left-4 sm:top-4 sm:scale-[0.88]" aria-label="SendFlow">
                  <BrandLockup />
                </div>
                 <div className="hero-globe-motion pointer-events-none absolute right-[4%] top-[3%] z-10 aspect-square w-[61%] rounded-full" aria-hidden="true">
                   <div className="hero-globe-motion__surface hero-globe-spin">
                     <ProtectedImage src={heroGlobe} alt="" className="hero-globe-motion__earth" />
                   </div>
                   <div className="hero-globe-motion__badge-layer">
                      {heroBadges.map(({ operator, position }, index) => {
                        const fallbackLogo = operatorLogoMarks[operator.name] ?? { mark: operator.name.slice(0, 1).toUpperCase(), background: '#6d35d8', foreground: '#ffffff' };
                        const logoUrl = operator.logoKey ? landingBundle?.media.find((item) => item.slug === operator.logoKey && item.isVisible)?.publicUrl : null;
                       return (
                         <span
                            key={operator.id}
                            className="hero-operator-badge"
                             style={{ ...position, animationDelay: `${index * -0.7}s`, ...(fallbackLogo.imageBackground ? { backgroundColor: fallbackLogo.imageBackground } : {}) }}
                            aria-label={`${operator.name} logo`}
                         >
                            {logoUrl || fallbackLogo.image ? <ProtectedImage src={logoUrl || fallbackLogo.image} alt="" /> : <span>{fallbackLogo.mark}</span>}
                         </span>
                       );
                     })}
                   </div>
                  <span className="hero-globe-motion__meridian hero-globe-motion__meridian--wide" />
                  <span className="hero-globe-motion__meridian hero-globe-motion__meridian--narrow" />
                </div>
                 <ProtectedImage src={heroWomanCutout} alt="" className="pointer-events-none absolute bottom-0 left-[17%] z-20 h-full w-auto max-w-none object-contain lg:left-[13%]" />
            </div>
           </div>
         </section>

         <section id="features-cards" className="px-5 py-16 sm:px-8 sm:py-24">
           <div className="mx-auto max-w-[1240px]">
             <div className="reveal max-w-[720px]">
                <h2 className="mt-0 max-w-[760px] text-5xl font-extrabold leading-[.9] tracking-[-.075em] text-[#17131f] sm:text-7xl lg:text-8xl">{t(localizedSection('networks', { title: { fr: 'Plusieurs réseaux. Une seule destination.', en: 'Many networks. One destination.' }, body: { fr: '', en: '' } }).title, language)}</h2>
                <p className="mt-7 max-w-[560px] text-[17px] font-semibold leading-7 text-[#30283b] sm:text-[19px]">{t(localizedSection('networks', { title: { fr: '', en: '' }, body: { fr: 'Envoyer de l’argent ne devrait pas dépendre du réseau utilisé par votre proche. SendFlow imagine un passage plus simple, plus lisible et plus direct.', en: 'Sending money should not depend on the network your loved one uses. SendFlow imagines a simpler, clearer, more direct path.' } }).body, language)}</p>
             </div>
             <div className="reveal mt-10 overflow-hidden rounded-[28px] border border-[#6d35d8]/10 bg-[#fbf8ef] shadow-[0_18px_50px_rgba(58,38,83,.07)]">
               <div className="grid items-center gap-2 p-4 sm:grid-cols-[1.25fr_.75fr] sm:p-6">
                  <ProtectedImage src={networkSectionArt} alt={isFrench ? 'Réseaux de paiement interconnectés' : 'Interconnected payment networks'} className="mx-auto h-52 w-full object-contain sm:h-64" />
                 <BrandedCharacter src={networkPersonArt} alt={isFrench ? 'Personne SendFlow aux côtés des réseaux interconnectés' : 'SendFlow person beside interconnected networks'} className="h-52 sm:h-64" />
               </div>
             </div>
              <div className="reveal mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {remoteFeatures.map((feature) => <div key={feature.title.fr} className="group min-h-[360px] rounded-[24px] border border-[#dbe5f2] bg-white p-5 shadow-[0_18px_48px_rgba(35,76,135,.08)] transition-transform hover:-translate-y-1 sm:p-6"><div className="flex h-36 items-center justify-between gap-2 overflow-hidden rounded-[18px] bg-[#f4f7fc] px-3 sm:h-40 sm:px-4"><ProtectedImage src={feature.icon} alt="" className="h-full min-w-0 flex-1 object-contain p-2 transition-transform duration-300 group-hover:scale-105 sm:p-3" /><span className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#6d35d8]/15 bg-white px-2 py-1.5 shadow-[0_6px_14px_rgba(58,38,83,.08)]" aria-label="SendFlow"><ProtectedImage src={sendflowMark} alt="" className="h-5 w-5 object-contain" /><ProtectedImage src={sendflowWordmark} alt="SendFlow" className="h-3.5 w-auto object-contain" /></span></div><h3 className="mt-6 text-[18px] font-extrabold tracking-[-.035em] text-[#17131f]">{t(feature.title, language)}</h3><p className="mt-3 max-w-[270px] text-[14px] font-medium leading-6 text-[#3d4654]">{t(feature.text, language)}</p></div>)}
             </div>
              <FeatureActionCards content={landingBundle?.content ?? []} language={language} />
              <div className="reveal mt-16 rounded-[28px] border-2 border-[#dbe5f2] bg-[#eef5ff] p-6 shadow-[0_18px_50px_rgba(35,76,135,.08)] sm:p-8">
                 <p className="text-[11px] font-extrabold uppercase tracking-[.17em] text-[#5b21b6]">{t(contentCopy(landingBundle?.content, 'features.principles.kicker', { fr: 'Une expérience, trois repères', en: 'One experience, three principles' }), language)}</p>
                 <h3 className="mt-4 max-w-[620px] text-3xl font-extrabold leading-tight tracking-[-.05em] text-[#17131f] sm:text-4xl">{t(contentCopy(landingBundle?.content, 'features.principles.title', { fr: 'Pensé pour une Afrique connectée.', en: 'Built for a connected Africa.' }), language)}</h3>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {[
                   { n: '01', title: { fr: 'Simplicité', en: 'Simplicity' }, text: { fr: 'Des choix clairs, sans détour.', en: 'Clear choices, no detours.' }, art: howPersonArt, artAlt: { fr: 'Personnage SendFlow illustrant la simplicité', en: 'SendFlow character illustrating simplicity' }, artBg: 'bg-[#f4f0ff]' },
                   { n: '02', title: { fr: 'Rapidité', en: 'Speed' }, text: { fr: 'Un parcours court et lisible.', en: 'A short, readable journey.' }, art: internationalPersonArt, artAlt: { fr: 'Personnage SendFlow illustrant la rapidité', en: 'SendFlow character illustrating speed' }, artBg: 'bg-[#eef7ff]' },
                   { n: '03', title: { fr: 'Interopérabilité', en: 'Interoperability' }, text: { fr: 'Des réseaux qui peuvent mieux dialoguer.', en: 'Networks that can speak more clearly.' }, art: networkPersonArt, artAlt: { fr: 'Personnage SendFlow illustrant l’interopérabilité', en: 'SendFlow character illustrating interoperability' }, artBg: 'bg-[#edf9f6]' },
                  ].map((principle) => <div key={principle.title.fr} className="group relative min-h-[250px] overflow-hidden rounded-[22px] border-2 border-white bg-white p-5 shadow-[0_12px_28px_rgba(35,76,135,.08)] transition-transform hover:-translate-y-1 sm:p-6"><div className={`absolute right-3 top-3 flex h-24 w-24 items-end justify-center overflow-hidden rounded-[18px] ${principle.artBg}`}><ProtectedImage src={principle.art} alt={t(principle.artAlt, language)} loading="lazy" decoding="async" className="h-24 w-24 object-contain object-bottom transition-transform duration-300 group-hover:scale-105" /></div><span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#211d2c] px-2 text-[11px] font-extrabold text-white">{principle.n}</span><h4 className="mt-16 max-w-[180px] text-[19px] font-extrabold leading-tight tracking-[-.04em] text-[#17131f]">{t(principle.title, language)}</h4><p className="mt-3 max-w-[190px] text-[14px] font-semibold leading-6 text-[#3d4654]">{t(principle.text, language)}</p></div>)}
                </div>
              </div>
           </div>
         </section>

         <section id="how" className="scroll-mt-28 bg-[#211d2c] px-5 py-24 text-[#fbf8ef] sm:px-8 sm:py-32">
          <div className="mx-auto max-w-[1240px]">
            <div className="reveal grid gap-12 lg:grid-cols-[.75fr_1.25fr] lg:gap-24">
               <div><h2 className="mt-0 max-w-[500px] whitespace-pre-line text-5xl font-extrabold leading-[.9] tracking-[-.075em] text-[#fbf8ef] sm:text-7xl lg:text-8xl">{t(localizedSection('how', { title: { fr: 'Un passage\nsimple.', en: 'One clear\npassage.' }, body: { fr: '', en: '' } }).title, language)}</h2><p className="mt-8 max-w-[360px] text-[16px] font-semibold leading-7 text-[#f4edff] sm:text-[17px]">{t(localizedSection('how', { title: { fr: '', en: '' }, body: { fr: 'Le réseau ne devrait jamais être votre problème. SendFlow rend chaque étape visible, du premier clic au dernier.', en: 'The network should never be your problem. SendFlow makes every step visible, from first click to last.' } }).body, language)}</p></div>
              <div className="grid gap-3 sm:grid-cols-3">
                {[{ n: '01', title: { fr: 'Choisissez', en: 'Choose' }, text: { fr: 'Votre pays, votre réseau, votre destination.', en: 'Your country, your network, your destination.' }, icon: Globe2, art: chooseStepArt }, { n: '02', title: { fr: 'Vérifiez', en: 'Check' }, text: { fr: 'Le montant et le chemin, sans surprise.', en: 'The amount and the path, no surprises.' }, icon: Sparkles, art: checkStepArt }, { n: '03', title: { fr: 'Envoyez', en: 'Send' }, text: { fr: 'Un dernier regard. Puis, c’est parti.', en: 'One last look. Then, it moves.' }, icon: ArrowDownRight, art: sendStepArt }].map((step) => <div key={step.n} className="group grid min-h-[210px] grid-cols-[.78fr_1.22fr] items-center gap-3 rounded-[24px] border border-[#fbf8ef]/15 bg-[#2b2638] p-4 transition-colors hover:border-[#9adacb]/60 sm:p-5"><div className="flex h-full items-center justify-center rounded-[18px] bg-[#211d2c]/55 p-2"><ProtectedImage src={step.art} alt="" className="h-28 w-full object-contain sm:h-32" /></div><div className="min-w-0"><div className="flex items-start justify-between gap-2"><span className="text-[11px] font-bold text-[#9adacb]">{step.n}</span><step.icon size={18} className="shrink-0 text-[#e8cd4d] transition-transform group-hover:rotate-12" /></div><h3 className="mt-10 text-xl font-bold tracking-[-.04em] text-[#fbf8ef]">{t(step.title, language)}</h3><p className="mt-3 text-[13px] font-medium leading-5 text-[#e5dff0]">{t(step.text, language)}</p></div></div>)}</div>
             </div>
             <div className="reveal mt-12 overflow-hidden rounded-[28px] border border-[#fbf8ef]/15 bg-[#2b2638] p-4 sm:p-6">
               <div className="grid items-center gap-2 sm:grid-cols-[1.25fr_.75fr]">
                  <ProtectedImage src={howItWorksSectionArt} alt={isFrench ? 'Parcours de transfert en trois étapes' : 'Three-step transfer journey'} className="mx-auto h-48 w-full object-contain sm:h-64" />
                 <BrandedCharacter src={howPersonArt} alt={isFrench ? 'Personne SendFlow qui guide le parcours de transfert' : 'SendFlow person guiding the transfer journey'} className="h-48 sm:h-64" />
               </div>
             </div>
             <div className="reveal mt-20 grid items-center gap-8 border-t border-[#fbf8ef]/15 pt-7 sm:grid-cols-[1fr_auto]"><div className="flex items-center gap-4"><div className="flex -space-x-2"><span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#211d2c] bg-[#e8cd4d] text-[10px] font-bold">CI</span><span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#211d2c] bg-[#9adacb] text-[10px] font-bold">SN</span><span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#211d2c] bg-[#b69de5] text-[10px] font-bold">GH</span></div><p className="text-[12px] text-[#bcb6c5]">{isFrench ? 'Une idée née entre plusieurs rives.' : 'An idea born between several shores.'}</p></div><span className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#e8cd4d]">{isFrench ? 'Pensé pour une Afrique connectée' : 'Built for a connected Africa'}</span></div>
          </div>
        </section>

        <section id="features" className="px-5 pt-24 pb-10 sm:px-8 sm:pt-32 sm:pb-14">
          <div className="mx-auto max-w-[1240px]">
            <div className="reveal flex flex-col justify-between gap-7 sm:flex-row sm:items-end">
              <div>
                <h2 className="mt-0 max-w-[760px] text-5xl font-extrabold leading-[.9] tracking-[-.075em] text-[#17131f] sm:text-7xl lg:text-8xl">
                  {t(localizedSection('international', { title: { fr: 'Votre argent,\nsans frontières mentales.', en: 'Your money,\nwithout mental borders.' }, body: { fr: '', en: '' } }).title, language)}
                </h2>
              </div>
               <p className="max-w-[320px] text-[15px] font-semibold leading-7 text-[#30283b] sm:text-[17px]">{t(localizedSection('international', { title: { fr: '', en: '' }, body: { fr: 'Explorez la couverture et les connexions qui donnent vie à SendFlow.', en: 'Explore the coverage and connections that bring SendFlow to life.' } }).body, language)}</p>
             </div>
             <div className="reveal mt-12 grid gap-4 sm:grid-cols-2">
               <div className="overflow-hidden rounded-[28px] border border-[#2d2535]/10 bg-[#fbf8ef] shadow-[0_18px_50px_rgba(58,38,83,.07)]">
                 <div className="grid items-center gap-1 p-4 sm:grid-cols-[1.15fr_.85fr] sm:p-5">
                    <ProtectedImage src={internationalSectionArt} alt={isFrench ? 'Transferts internationaux autour de l’Afrique' : 'International transfers around Africa'} className="h-52 w-full object-contain sm:h-60" />
                   <BrandedCharacter src={internationalPersonArt} alt={isFrench ? 'Personne SendFlow pour les transferts internationaux' : 'SendFlow person for international transfers'} className="h-52 sm:h-60" />
                 </div>
               </div>
               <div className="overflow-hidden rounded-[28px] border border-[#2d2535]/10 bg-[#d7eee8] shadow-[0_18px_50px_rgba(58,38,83,.07)]">
                 <div className="grid items-center gap-1 p-4 sm:grid-cols-[1.15fr_.85fr] sm:p-5">
                    <ProtectedImage src={coverageSectionArt} alt={isFrench ? 'Couverture africaine de SendFlow' : 'SendFlow African coverage'} className="h-52 w-full object-contain sm:h-60" />
                   <BrandedCharacter src={coveragePersonArt} alt={isFrench ? 'Ambassadrice SendFlow pour la couverture africaine' : 'SendFlow ambassador for African coverage'} className="h-52 sm:h-60" />
                 </div>
               </div>
             </div>
              <div id="international" className="reveal mt-12 scroll-mt-28 grid gap-4 lg:grid-cols-[.82fr_1.18fr]">
              <div className="rounded-[28px] bg-[#e8cd4d] p-6 sm:p-8"><div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-[.14em]">{isFrench ? 'Couverture SendFlow' : 'SendFlow coverage'}</span><span className="rounded-full bg-[#211d2c]/10 px-3 py-1 text-[10px] font-bold">{activeCountries.length} pays</span></div><div className="mt-10 text-[clamp(3.5rem,8vw,6.5rem)] font-extrabold leading-[.8] tracking-[-.09em]">{activeCountries.length}<span className="font-serif font-normal text-[#6d35d8]">.</span></div><p className="mt-6 max-w-[280px] text-[15px] font-semibold leading-6 text-[#211d2c]/85">{isFrench ? 'Des connexions pensées pour accompagner vos transferts.' : 'Connections designed to support your transfers.'}</p><div className="mt-10 flex flex-wrap gap-2">{activeCountries.map((country) => <button key={country.code} onClick={() => setSelectedCountry(country)} className={`rounded-full border px-3 py-2 text-[11px] font-bold transition-all ${selectedCountry.code === country.code ? 'border-[#211d2c] bg-[#211d2c] text-[#fbf8ef]' : 'border-[#211d2c]/20 hover:border-[#211d2c]'}`} data-testid={`button-country-${country.code}`}><span className="mr-1">{country.flag}</span>{country.code}</button>)}</div></div>
                 {activeSelectedCountry ? <div className="rounded-[20px] border-2 border-[#cbdced] bg-white p-6 shadow-[0_22px_55px_rgba(43,75,115,.14)] sm:p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.14em] text-[#8d8792]">{isFrench ? 'Opérateurs disponibles' : 'Available operators'}</p>
                      <h3 className="mt-2 text-3xl font-extrabold tracking-[-.06em]">{activeSelectedCountry.name}</h3>
                  </div>
                   <span
                     className="flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-none text-[10px] font-bold leading-none"
                      style={{ backgroundColor: activeSelectedCountry.tone }}
                      aria-label={`${activeSelectedCountry.name} (${activeSelectedCountry.code})`}
                   >
                      <span className="text-[20px] leading-none" aria-hidden="true">{activeSelectedCountry.flag}</span>
                      <span>{activeSelectedCountry.code}</span>
                   </span>
                </div>
                  <div className="mt-10 rounded-[18px] border border-[#e2e6ef] bg-[#f4f3f9] p-5 sm:p-6"><div className="grid grid-cols-2 gap-x-8 gap-y-7 sm:grid-cols-4">{displayNetworks.map((network) => <OperatorRow key={network} network={network} operator={landingBundle?.operators.find((item) => item.name === network && item.isVisible)} media={landingBundle?.media ?? []} />)}</div></div>
               </div> : <div className="flex min-h-[220px] items-center justify-center rounded-[20px] border-2 border-[#cbdced] bg-white p-6 text-center text-sm font-semibold text-[#3d4654] shadow-[0_22px_55px_rgba(43,75,115,.14)]">{isFrench ? 'Aucun pays n’est actuellement publié.' : 'No countries are currently published.'}</div>}
            </div>
          </div>
        </section>

        <DeveloperApiCard
          eyebrow={t(contentCopy(landingBundle?.content, 'developer.api.eyebrow', { fr: 'API pour les développeurs', en: 'Developer API' }), language)}
          title={t(contentCopy(landingBundle?.content, 'developer.api.title', { fr: 'Initiez un paiement avec l’API SendFlow.', en: 'Initiate a payment with the SendFlow API.' }), language)}
          body={t(contentCopy(landingBundle?.content, 'developer.api.body', { fr: 'Exemple de requête JSON vers l’endpoint de paiement entrant.', en: 'Example JSON request to the pay-in endpoint.' }), language)}
          codeLabel={t(contentCopy(landingBundle?.content, 'developer.api.codeLabel', { fr: 'Requête JSON · Paiement entrant', en: 'JSON request · Pay-in' }), language)}
          code={t(contentCopy(landingBundle?.content, 'developer.api.code', developerApiExample), language)}
        />

        <PublicOperatorFees bundle={landingBundle} language={language} />

        <section id="security" className="overflow-hidden px-5 py-12 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-[1240px] items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
            <div className="reveal relative min-h-[380px] sm:min-h-[480px]">
               <ProtectedImage src={securitySectionArt} alt={isFrench ? 'Protection et sécurité des transferts' : 'Transfer protection and security'} className="absolute bottom-0 left-[1%] z-10 h-[220px] w-[220px] object-contain object-center sm:left-[2%] sm:h-[360px] sm:w-[360px]" />
               <div className="absolute bottom-0 right-[5%] z-20 h-[300px] w-[300px] sm:right-[3%] sm:h-[460px] sm:w-[460px]">
                  <ProtectedImage src={securityGuardianArt} alt={isFrench ? 'Gardien 3D de la sécurité SendFlow' : '3D SendFlow security guardian'} className="h-full w-full object-contain object-center" />
                </div>
               <div className="absolute left-1/2 top-[-2%] z-30 flex w-max max-w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-3 rounded-full border-2 border-[#6d35d8]/25 bg-white px-4 py-2.5 shadow-[0_12px_28px_rgba(80,40,170,.2)] sm:top-[-1%] sm:gap-4 sm:px-6 sm:py-3.5">
                  <ProtectedImage src={sendflowMark} alt="" className="h-10 w-10 object-contain sm:h-14 sm:w-14" />
                  <ProtectedImage src={sendflowWordmark} alt="SendFlow" className="h-8 w-auto object-contain sm:h-12" />
               </div>
               <div className="security-ground-shadow absolute bottom-[1%] left-1/2 z-0 h-12 w-64 -translate-x-1/2 sm:h-16 sm:w-[390px]" />
              <div className="absolute left-[30%] top-[34%] flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#6d35d8] text-[#fbf8ef] shadow-[0_18px_35px_rgba(109,53,216,.25)] sm:h-32 sm:w-32"><LockKeyhole size={34} strokeWidth={1.5} /></div>
              <div className="absolute bottom-[4%] left-[3%] rounded-2xl bg-[#211d2c] px-4 py-3 text-[11px] text-[#fbf8ef] shadow-lg"><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#9adacb]" />{isFrench ? 'En contrôle' : 'In control'}</div>
            </div>
             <div className="reveal"><h2 className="mt-0 max-w-[760px] whitespace-pre-line text-5xl font-extrabold leading-[.9] tracking-[-.075em] text-[#17131f] sm:text-7xl lg:text-8xl">{t(contentCopy(landingBundle?.content, 'security.title', { fr: 'Chaque étape\nà découvert.', en: 'Every step,\nin the clear.' }), language)}</h2><p className="mt-8 max-w-[520px] text-[17px] font-semibold leading-7 text-[#30283b] sm:text-[19px]">{t(contentCopy(landingBundle?.content, 'security.body', { fr: 'Le calme vient de ce que l’on comprend. SendFlow rend les détails lisibles, les choix explicites et le contrôle toujours à portée de main.', en: 'Calm comes from understanding. SendFlow makes details readable, choices explicit, and control always within reach.' }), language)}</p><div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-[#dbe5f2] bg-white p-4 shadow-[0_12px_28px_rgba(35,76,135,.06)]"><div className="flex items-center justify-between gap-3"><ProtectedImage src={visibleDetailsIcon} alt="" className="h-14 w-20 object-contain" /><span className="flex shrink-0 items-center gap-1 rounded-full border border-[#6d35d8]/15 bg-[#f4f7fc] px-2 py-1.5"><ProtectedImage src={sendflowMark} alt="" className="h-4 w-4 object-contain" /><ProtectedImage src={sendflowWordmark} alt="SendFlow" className="h-3 w-auto object-contain" /></span></div><h3 className="mt-5 text-[15px] font-extrabold">{t(contentCopy(landingBundle?.content, 'security.visible.title', { fr: 'Détails visibles', en: 'Visible details' }), language)}</h3><p className="mt-2 text-[12px] font-medium leading-5 text-[#3d4654]">{t(contentCopy(landingBundle?.content, 'security.visible.body', { fr: 'Comprendre avant de confirmer.', en: 'Understand before you confirm.' }), language)}</p></div><div className="rounded-2xl border border-[#dbe5f2] bg-white p-4 shadow-[0_12px_28px_rgba(35,76,135,.06)]"><div className="flex items-center justify-between gap-3"><ProtectedImage src={privateIcon} alt="" className="h-14 w-20 object-contain" /><span className="flex shrink-0 items-center gap-1 rounded-full border border-[#6d35d8]/15 bg-[#f4f7fc] px-2 py-1.5"><ProtectedImage src={sendflowMark} alt="" className="h-4 w-4 object-contain" /><ProtectedImage src={sendflowWordmark} alt="SendFlow" className="h-3 w-auto object-contain" /></span></div><h3 className="mt-5 text-[15px] font-extrabold">{t(contentCopy(landingBundle?.content, 'security.private.title', { fr: 'Pensé privé', en: 'Privacy-minded' }), language)}</h3><p className="mt-2 text-[12px] font-medium leading-6 text-[#3d4654]">{t(contentCopy(landingBundle?.content, 'security.private.body', { fr: 'Moins de données, plus de sérénité.', en: 'Less data, more peace of mind.' }), language)}</p></div></div></div>
          </div>
        </section>

          <section id="about" aria-label={isFrench ? 'Opérateurs de paiement partenaires' : 'Partner payment operators'} className="overflow-hidden border-b border-[#2d2535]/10 bg-white/70 py-4 sm:py-5"><div className="flex flex-col gap-2" aria-hidden="false"><div className="marquee-track marquee-track--reverse flex w-max items-center"><ProtectedImage src={operatorLogosTicker} alt={isFrench ? 'Logos des opérateurs de paiement partenaires' : 'Partner payment operator logos'} className="h-10 w-auto max-w-none object-contain sm:h-12" /><ProtectedImage src={operatorLogosTicker} alt="" aria-hidden="true" className="h-10 w-auto max-w-none object-contain sm:h-12" /></div><div className="marquee-track flex w-max items-center"><ProtectedImage src={operatorLogosTicker} alt="" aria-hidden="true" className="h-10 w-auto max-w-none object-contain sm:h-12" /><ProtectedImage src={operatorLogosTicker} alt="" aria-hidden="true" className="h-10 w-auto max-w-none object-contain sm:h-12" /></div></div></section>

        <section id="faq" className="px-5 py-24 sm:px-8 sm:py-32"><div className="mx-auto grid max-w-[1040px] gap-14 lg:grid-cols-[.7fr_1.3fr]"><div className="reveal"><h2 className="mt-0 text-6xl font-extrabold leading-[.88] tracking-[-.075em] text-[#17131f] sm:text-8xl">{t(sectionCopy('faq', { fr: 'Vous avez raison.', en: 'Good questions.' }), language)}</h2><p className="mt-8 max-w-[300px] text-[16px] font-semibold leading-7 text-[#30283b]">{t(sectionBody('faq', { fr: 'Une idée nouvelle mérite des réponses simples.', en: 'A new idea deserves simple answers.' }), language)}</p></div><div className="reveal space-y-2">{activeFaqs.map((faq, index) => <div key={index} className="border-b border-[#2d2535]/15"><button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="flex w-full items-center justify-between py-5 text-left text-[16px] font-bold tracking-[-.025em] text-[#17131f]" data-testid={`button-faq-${index}`}><span>{t(faq.q, language)}</span><ChevronDown size={18} className={`shrink-0 text-[#6d35d8] transition-transform ${openFaq === index ? 'rotate-180' : ''}`} /></button><div className={`grid transition-[grid-template-rows] duration-300 ${openFaq === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}><div className="overflow-hidden"><p className="pb-5 pr-8 text-[14px] font-medium leading-6 text-[#30283b]">{t(faq.a, language)}</p></div></div></div>)}</div></div></section>

         <section id="join" className="px-5 pb-24 sm:px-8 sm:pb-32"><div className="reveal relative mx-auto max-w-[1240px] overflow-hidden rounded-[32px] bg-[#6d35d8] px-6 py-14 text-[#fbf8ef] sm:px-14 sm:py-20"><div className="absolute -right-16 -top-24 h-72 w-72 rounded-full border border-[#fbf8ef]/20" /><div className="absolute -right-2 -top-10 h-48 w-48 rounded-full border border-[#fbf8ef]/15" /><div className="relative max-w-[680px]"><p className="text-[11px] font-bold uppercase tracking-[.17em] text-[#e8cd4d]">The next move</p><h2 className="mt-5 text-6xl font-extrabold leading-[.86] tracking-[-.08em] sm:text-8xl">{isFrench ? <>Prêt·e à faire<br /><em className="font-serif font-normal text-[#e8cd4d]">bouger les choses ?</em></> : <>Ready to<br /><em className="font-serif font-normal text-[#e8cd4d]">move things?</em></>}</h2><p className="mt-8 max-w-[500px] text-[17px] font-semibold leading-7 text-[#f4edff]">{isFrench ? 'Recevez les prochaines nouvelles de SendFlow. Pas de bruit, juste les avancées.' : 'Get the next SendFlow updates. No noise, just progress.'}</p><form onSubmit={submitNewsletter} className="mt-8 flex max-w-[480px] flex-col gap-3"><label className="flex items-start gap-3 text-[13px] font-semibold leading-5 text-[#fbf8ef]"><input type="checkbox" checked={newsletterConsent} onChange={(event) => setNewsletterConsent(event.target.checked)} required className="mt-1 h-4 w-4 accent-[#e8cd4d]" data-testid="checkbox-newsletter-consent" /><span>{isFrench ? 'J’accepte de recevoir par e-mail les actualités de SendFlow. Je pourrai me désabonner à tout moment.' : 'I agree to receive SendFlow updates by email. I can unsubscribe at any time.'}</span></label><input value={email} onChange={(event) => { setEmail(event.target.value); setSubmitted(false); setNewsletterError(null); }} type="email" required placeholder={isFrench ? 'votre@email.com' : 'your@email.com'} className="min-h-[54px] min-w-0 flex-1 rounded-[14px] border-2 border-white/60 bg-white px-5 py-3.5 text-[14px] font-semibold text-[#211d2c] outline-none placeholder:text-[#7d6b9a] shadow-[0_10px_24px_rgba(33,29,44,.12)] focus:border-[#e8cd4d] focus:ring-2 focus:ring-[#e8cd4d]/30" data-testid="input-email" /><button type="submit" disabled={newsletterSubmitting} className="inline-flex min-h-[54px] items-center justify-center rounded-[14px] border-2 border-[#a68bea] bg-[#5b21b6] px-6 py-3.5 text-[14px] font-extrabold text-white shadow-[0_14px_28px_rgba(33,29,44,.24)] transition-all hover:-translate-y-0.5 hover:bg-[#4c1d95] disabled:cursor-wait disabled:opacity-70" data-testid="button-submit-email">{submitted ? <><Check className="mr-1 inline" size={14} />{isFrench ? 'C’est noté' : 'You’re on it'}</> : newsletterSubmitting ? (isFrench ? 'Inscription…' : 'Joining…') : <>{isFrench ? 'Me tenir au courant' : 'Keep me posted'} <ArrowRight className="ml-2 inline" size={17} /></>}</button></form>{newsletterError && <p className="mt-3 text-[12px] font-semibold text-[#ffe5e5]" role="alert">{newsletterError}</p>}<p className="mt-4 text-[11px] font-medium text-[#e5dff0]">{submitted ? (isFrench ? 'Si cette adresse peut recevoir les nouvelles de SendFlow, un lien de confirmation a été envoyé.' : 'If this address can receive SendFlow updates, a confirmation link has been sent.') : (isFrench ? 'Des nouvelles utiles, sans spam. Désinscription en un clic.' : 'Useful updates, no spam. Unsubscribe in one click.')}</p></div></div></section>
        <section id="download" className="px-5 pb-24 sm:px-8 sm:pb-32">
           <div className="reveal relative mx-auto max-w-[1240px] overflow-hidden rounded-[32px] bg-[#6d35d8] px-6 py-10 text-[#fbf8ef] sm:px-14 sm:py-16">
             <p className="text-[11px] font-bold uppercase tracking-[.17em] text-[#e8cd4d]">{t(contentCopy(landingBundle?.content, 'cta.nextMove', { fr: 'Le prochain mouvement', en: 'The next move' }), language)}</p>
             <h2 className="mt-5 max-w-[820px] whitespace-pre-line text-6xl font-extrabold leading-[.86] tracking-[-.08em] sm:text-8xl">{t(contentCopy(landingBundle?.content, 'cta.download.title', { fr: 'Votre prochain transfert\ncommence ici.', en: 'Your next transfer\nstarts here.' }), language)}</h2>
              <p className="mt-7 max-w-[540px] text-[17px] font-semibold leading-7 text-[#f4edff]">{t(contentCopy(landingBundle?.content, 'cta.download.body', { fr: 'Téléchargez bientôt l’application SendFlow et simplifiez vos transferts entre réseaux.', en: 'Download the SendFlow app soon and simplify transfers across networks.' }), language)}</p>
                <a
                  href={registrationUrl ?? undefined}
                  onClick={(event) => {
                    if (!registrationUrl) event.preventDefault();
                  }}
                  aria-disabled={!registrationUrl}
                  role={registrationUrl ? undefined : 'link'}
                  title={!registrationUrl ? 'Configurez l’URL d’inscription dans le panneau admin.' : undefined}
                  className={`mt-6 inline-flex items-center rounded-[14px] border-2 border-[#a68bea] bg-[#5b21b6] px-6 py-3.5 text-[14px] font-extrabold text-white shadow-[0_14px_28px_rgba(33,29,44,.24)] transition-all hover:-translate-y-0.5 hover:bg-[#4c1d95] ${registrationUrl ? '' : 'cursor-not-allowed opacity-50'}`}
                  data-testid="button-register-bottom"
                >
                  {registrationLabel}<ArrowRight className="ml-2" size={17} />
                </a>
              <div className="mt-4 flex flex-wrap gap-3">
               <StoreBadge store="Google Play" icon="play" href={googlePlayUrl} soonLabel={isFrench ? 'bientôt' : 'coming soon'} className="sendflow-store-badge--large sendflow-store-badge--featured" />
               <StoreBadge store="App Store" icon="apple" href={appStoreUrl} soonLabel={isFrench ? 'bientôt' : 'coming soon'} className="sendflow-store-badge--large sendflow-store-badge--featured" />
            </div>
              <div className="mt-8 grid items-end gap-1 sm:grid-cols-[1.1fr_.9fr] lg:absolute lg:right-8 lg:top-1/2 lg:mt-0 lg:w-[430px] lg:-translate-y-1/2">
                <ProtectedImage src={downloadSectionArt} alt={isFrench ? 'Application mobile SendFlow' : 'SendFlow mobile app'} className="h-44 w-full object-contain sm:h-56" />
                <BrandedCharacter src={downloadPersonArt} alt={isFrench ? 'Personne SendFlow avec l’application mobile' : 'SendFlow person with the mobile app'} className="h-44 sm:h-56" />
             </div>
          </div>
        </section>
      </main>

       <SendFlowFooter
         isFrench={isFrench}
         onNavigate={goTo}
         settings={landingBundle?.settings ?? null}
         content={landingBundle?.content ?? []}
         contact={{
           email: landingBundle?.settings?.homeContactEmail,
           phone: landingBundle?.settings?.homeContactPhone,
           whatsapp: landingBundle?.settings?.homeContactWhatsapp,
         }}
       />
      <footer className="bg-[#211d2c] px-5 py-12 text-[#fbf8ef] sm:px-8 sm:py-16"><div className="mx-auto max-w-[1240px]"><div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_.6fr_.6fr_.8fr]"><div><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e8cd4d] text-[#211d2c]"><ArrowDownRight size={17} strokeWidth={2.5} /></span><span className="text-[17px] font-bold tracking-[-.045em]">sendflow<span className="text-[#e8cd4d]">.</span></span></div><p className="mt-6 max-w-[280px] text-[13px] leading-6 text-[#bcb6c5]">{isFrench ? 'Une vision plus calme des mouvements d’argent en Afrique.' : 'A calmer vision for moving money across Africa.'}</p></div><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#9adacb]">{isFrench ? 'Explorer' : 'Explore'}</p><div className="mt-5 flex flex-col gap-3 text-[13px] text-[#bcb6c5]">{navItems.slice(0, 3).map((item) => <button key={item.id} onClick={() => goTo(item.id)} className="w-fit transition-colors hover:text-[#e8cd4d]" data-testid={`link-footer-${item.id}`}>{t(item.label, language)}</button>)}</div></div><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#9adacb]">{isFrench ? 'Projet' : 'Project'}</p><div className="mt-5 flex flex-col gap-3 text-[13px] text-[#bcb6c5]"><button onClick={() => goTo('security')} className="w-fit hover:text-[#e8cd4d]" data-testid="link-footer-security">{isFrench ? 'Notre approche' : 'Our approach'}</button><button onClick={() => goTo('faq')} className="w-fit hover:text-[#e8cd4d]" data-testid="link-footer-faq">{isFrench ? 'Questions' : 'Questions'}</button><button onClick={() => goTo('join')} className="w-fit hover:text-[#e8cd4d]" data-testid="link-footer-join">{isFrench ? 'Contact' : 'Contact'}</button></div></div><div><p className="text-[11px] font-bold uppercase tracking-[.15em] text-[#9adacb]">{isFrench ? 'Statut' : 'Status'}</p><div className="mt-5 flex items-center gap-2 text-[13px] text-[#bcb6c5]"><span className="h-2 w-2 rounded-full bg-[#9adacb]" />{isFrench ? 'Démo en évolution' : 'Demo in progress'}</div><button onClick={() => navigate(getLocalizedPath(window.location.pathname, isFrench ? 'en' : 'fr'))} className="mt-5 flex items-center gap-2 text-[12px] font-semibold text-[#e8cd4d]" data-testid="button-footer-language"><Globe2 size={14} /> {isFrench ? 'English version' : 'Version française'}</button></div></div><div className="mt-14 flex flex-col justify-between gap-4 border-t border-[#fbf8ef]/15 pt-5 text-[10px] text-[#8d8792] sm:flex-row"><span>© 2026 SendFlow Studio. {isFrench ? 'Projet conceptuel.' : 'Concept project.'}</span><span className="flex gap-4"><span>{isFrench ? 'Confidentialité' : 'Privacy'}</span><span>{isFrench ? 'Mentions' : 'Legal'}</span></span></div></div></footer>
    </div>
  );
}

export default App;