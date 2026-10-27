import { useEffect, useState } from 'react';
import { ArrowRight, ChevronRight, Globe2, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import sendflowMark from '@assets/sendflow-mark-original.png';
import sendflowWordmark from '@assets/sendflow-wordmark-original.png';
import securityLockIcon from '@assets/generated_images/sendflow-security-lock-icon-clean.png';
import securityCheckIcon from '../assets/sendflow-security-check.svg';
import securityHeroArt from '@assets/generated_images/sendflow-security-hero-3d-clean.png';
import { SendFlowFooter, type FooterContentItem, type FooterSettings } from '@/components/sendflow-footer';
import { ProtectedImage } from '@/components/protected-image';
import { useSeo } from '@/lib/seo';
import { getLocaleFromPath, getLocalizedPath } from '@/lib/localized-routes';
import publicSeoRoutes from '@/lib/public-seo-routes.json';
import {
  getRegistrationUrl,
  REGISTRATION_CTA_DEFAULT_LABELS,
  REGISTRATION_CTA_LABEL_KEY,
  REGISTRATION_CTA_URL_KEY,
} from '@/lib/registration-cta';

type Language = 'fr' | 'en';

type LandingResponse = {
  settings?: FooterSettings | null;
  content?: FooterContentItem[];
};

function publicContentValue(content: FooterContentItem[], key: string, locale: Language, fallback: string) {
  return content.find((item) => item.contentKey === key && item.locale === locale && item.isVisible)?.value ?? fallback;
}

const copy = {
  fr: {
    home: 'Accueil',
    features: 'Fonctionnalités',
    security: 'Sécurité',
    language: 'EN',
    menuOpen: 'Ouvrir le menu',
    menuClose: 'Fermer le menu',
    heroLead: 'Votre',
    heroAccent: 'Sécurité',
    heroEnd: 'notre priorité',
    heroBody: 'SendFlow utilise les technologies de sécurité les plus avancées pour protéger votre argent et vos données personnelles.',
    guarantees: 'Nos garanties de sécurité',
    items: [
      'Chiffrement AES-256 de bout en bout',
      'Authentification à deux facteurs (OTP)',
      'Protection par code PIN sécurisé',
      'Surveillance anti-fraude 24h/24 et 7j/7',
      'Conformité aux normes bancaires internationales',
      'Sessions sécurisées avec déconnexion automatique',
      'Historique complet et traçabilité de chaque transaction',
    ],
  },
  en: {
    home: 'Home',
    features: 'Features',
    security: 'Security',
    language: 'FR',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    heroLead: 'Your',
    heroAccent: 'Security',
    heroEnd: 'our priority',
    heroBody: 'SendFlow uses advanced security technologies to protect your money and personal data.',
    guarantees: 'Our security guarantees',
    items: [
      'End-to-end AES-256 encryption',
      'Two-factor authentication (OTP)',
      'Secure PIN code protection',
      '24/7 anti-fraud monitoring',
      'Compliance with international banking standards',
      'Secure sessions with automatic logout',
      'Complete history and traceability for every transaction',
    ],
  },
} as const;

function Brand() {
  return (
    <Link href="/" className="sf-features-brand" aria-label="SendFlow">
      <ProtectedImage src={sendflowMark} alt="" />
      <ProtectedImage src={sendflowWordmark} alt="SendFlow" />
    </Link>
  );
}

export default function SecurityPage() {
  const [, navigate] = useLocation();
  const [language] = useState<Language>(() => getLocaleFromPath(window.location.pathname));
  const [menuOpen, setMenuOpen] = useState(false);
  const [settings, setSettings] = useState<FooterSettings | null>(null);
  const [content, setContent] = useState<FooterContentItem[]>([]);
  const t = copy[language];

  useSeo({
    path: '/securite',
    locale: language,
    title: publicSeoRoutes.security[language].title,
    description: publicSeoRoutes.security[language].description,
    breadcrumbs: [{ name: language === 'fr' ? 'Accueil' : 'Home', path: '/' }, { name: t.security, path: '/securite' }],
  });

  useEffect(() => {
    let active = true;
    fetch('/api/landing')
      .then((response) => response.ok ? response.json() as Promise<LandingResponse> : null)
      .then((data) => {
        if (!active) return;
        setSettings(data?.settings ?? null);
        setContent(data?.content ?? []);
      })
      .catch(() => {
        if (!active) return;
        setSettings(null);
        setContent([]);
      });
    return () => { active = false; };
  }, []);

  const closeMenu = () => setMenuOpen(false);
  const toggleLanguage = () => {
    navigate(getLocalizedPath(window.location.pathname, language === 'fr' ? 'en' : 'fr'));
    closeMenu();
  };
  const registrationUrl = getRegistrationUrl(publicContentValue(content, REGISTRATION_CTA_URL_KEY, 'fr', ''));
  const registrationLabel = publicContentValue(
    content,
    REGISTRATION_CTA_LABEL_KEY,
    language,
    REGISTRATION_CTA_DEFAULT_LABELS[language],
  );
  const pageContact = {
    email: settings?.securityContactEmail,
    phone: settings?.securityContactPhone,
    whatsapp: settings?.securityContactWhatsapp,
  };

  return (
    <div className="sf-security-page">
      <header className="sf-features-header">
        <div className="sf-features-header-inner">
          <Brand />
          <nav className="sf-features-desktop-nav" aria-label="Primary">
            <Link href={getLocalizedPath('/', language)}>{t.home}</Link>
            <Link href={getLocalizedPath('/fonctionnalites', language)}>{t.features}</Link>
            <Link href={getLocalizedPath('/securite', language)} className="is-active">{t.security}</Link>
            <a
              href={registrationUrl ?? undefined}
              onClick={(event) => {
                if (!registrationUrl) event.preventDefault();
              }}
              aria-disabled={!registrationUrl}
              role={registrationUrl ? undefined : 'link'}
              title={!registrationUrl ? 'Configurez l’URL d’inscription dans le panneau admin.' : undefined}
            >
              {registrationLabel}
            </a>
            <button type="button" onClick={toggleLanguage}><Globe2 size={15} />{t.language}</button>
          </nav>
          <button type="button" className="sf-features-menu-button" onClick={() => setMenuOpen(true)} aria-label={t.menuOpen} aria-expanded={menuOpen} aria-controls="sf-public-mobile-navigation">
            <Menu size={26} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div
          className="sf-public-nav-backdrop"
          onClick={closeMenu}
          onKeyDown={(event) => {
            if (event.key === 'Escape') closeMenu();
          }}
          role="presentation"
        >
          <aside
            id="sf-public-mobile-navigation"
            className="sf-public-nav-panel"
            onClick={(event) => event.stopPropagation()}
            aria-label={language === 'fr' ? 'Menu principal' : 'Main menu'}
            aria-modal="true"
            role="dialog"
          >
            <div className="sf-public-nav-top">
              <Brand />
              <button type="button" className="sf-public-nav-close" onClick={closeMenu} aria-label={t.menuClose}>
                <X size={18} />
              </button>
            </div>
            <div className="sf-public-nav-intro">
              <p>Navigation</p>
              <h2>{language === 'fr' ? 'Explorer SendFlow' : 'Explore SendFlow'}</h2>
            </div>
            <nav className="sf-public-nav-links" aria-label={language === 'fr' ? 'Navigation principale' : 'Main navigation'}>
              <Link href={getLocalizedPath('/', language)} onClick={closeMenu} className="sf-public-nav-link">
                <span>{t.home}</span><ChevronRight aria-hidden="true" size={17} className="sf-public-nav-link-arrow" />
              </Link>
              <Link href={getLocalizedPath('/fonctionnalites', language)} onClick={closeMenu} className="sf-public-nav-link">
                <span>{t.features}</span><ChevronRight aria-hidden="true" size={17} className="sf-public-nav-link-arrow" />
              </Link>
              <Link href={getLocalizedPath('/securite', language)} onClick={closeMenu} className="sf-public-nav-link" aria-current="page">
                <span>{t.security}</span><ChevronRight aria-hidden="true" size={17} className="sf-public-nav-link-arrow" />
              </Link>
            </nav>
            <div className="sf-public-nav-footer">
              <button type="button" className="sf-public-nav-language" onClick={toggleLanguage}>
                <span>{language === 'fr' ? 'Langue' : 'Language'}</span>
                <strong><Globe2 size={15} aria-hidden="true" />{language === 'fr' ? 'English' : 'Français'}</strong>
              </button>
              <a
                href={registrationUrl ?? undefined}
                onClick={(event) => {
                  if (!registrationUrl) {
                    event.preventDefault();
                    return;
                  }
                  closeMenu();
                }}
                aria-disabled={!registrationUrl}
                role={registrationUrl ? undefined : 'link'}
                title={!registrationUrl ? 'Configurez l’URL d’inscription dans le panneau admin.' : undefined}
                className="sf-public-nav-cta"
                data-testid="button-security-register"
              >
                {registrationLabel}<ArrowRight aria-hidden="true" size={16} />
              </a>
            </div>
          </aside>
        </div>
      )}

      <main>
        <section className="sf-security-hero">
          <div className="sf-security-hero-content">
            <h1>{t.heroLead} <span>{t.heroAccent}</span>, notre<br className="sf-security-hero-break" /> priorité</h1>
            <p>{t.heroBody}</p>
          </div>
        </section>

        <section className="sf-security-guarantees" aria-labelledby="sf-security-guarantees-title">
          <div className="sf-security-lock" aria-hidden="true">
            <ProtectedImage src={securityLockIcon} alt="" />
          </div>
          <h2 id="sf-security-guarantees-title">{t.guarantees}</h2>
          <ul>
            {t.items.map((item) => (
              <li key={item}>
                <span className="sf-security-check" aria-hidden="true">
                  <ProtectedImage src={securityCheckIcon} alt="" />
                </span>
                <strong>{item}</strong>
              </li>
            ))}
          </ul>
        </section>

        <section className="sf-security-art" aria-label={language === 'fr' ? 'Illustration de protection SendFlow' : 'SendFlow protection illustration'}>
          <div className="sf-security-art-glow" aria-hidden="true" />
          <ProtectedImage src={securityHeroArt} alt="" />
        </section>
      </main>

      <SendFlowFooter isFrench={language === 'fr'} settings={settings} content={content} contact={pageContact} />
    </div>
  );
}