import { useEffect, useState } from 'react';
import { ChevronRight, Globe2, Menu, X } from 'lucide-react';
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

type Language = 'fr' | 'en';

type LandingResponse = {
  settings?: FooterSettings | null;
  content?: FooterContentItem[];
};

const copy = {
  fr: {
    home: 'Accueil',
    features: 'Fonctionnalités',
    security: 'Sécurité',
    download: 'Télécharger',
    support: 'Assistance',
    language: 'EN',
    menuOpen: 'Ouvrir le menu',
    menuClose: 'Fermer le menu',
    switchLanguage: 'Passer en anglais',
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
    download: 'Download',
    support: 'Support',
    language: 'FR',
    menuOpen: 'Open menu',
    menuClose: 'Close menu',
    switchLanguage: 'Switch to French',
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
  const supportEmail = settings?.securityContactEmail?.trim() || settings?.supportEmail?.trim() || '';
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
            <Link href={getLocalizedPath('/download', language)}>{t.download}</Link>
            {supportEmail && <a href={`mailto:${supportEmail}`}>{t.support}</a>}
            <button type="button" onClick={toggleLanguage}><Globe2 size={15} />{t.language}</button>
          </nav>
          <button type="button" className="sf-features-menu-button" onClick={() => setMenuOpen(true)} aria-label={t.menuOpen} aria-expanded={menuOpen}>
            <Menu size={26} />
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="sf-features-menu-backdrop" onClick={closeMenu}>
          <aside className="sf-features-menu" onClick={(event) => event.stopPropagation()}>
            <div className="sf-features-menu-top">
              <Brand />
              <button type="button" onClick={closeMenu} aria-label={t.menuClose}><X size={24} /></button>
            </div>
            <nav>
              <Link href={getLocalizedPath('/', language)} onClick={closeMenu}>{t.home}<ChevronRight size={18} /></Link>
              <Link href={getLocalizedPath('/fonctionnalites', language)} onClick={closeMenu}>{t.features}<ChevronRight size={18} /></Link>
              <Link href={getLocalizedPath('/securite', language)} onClick={closeMenu}>{t.security}<ChevronRight size={18} /></Link>
              <Link href={getLocalizedPath('/download', language)} onClick={closeMenu}>{t.download}<ChevronRight size={18} /></Link>
              {supportEmail && <a href={`mailto:${supportEmail}`} onClick={closeMenu}>{t.support}<ChevronRight size={18} /></a>}
            </nav>
            <button type="button" className="sf-features-menu-language" onClick={toggleLanguage}>
              <span aria-hidden="true">{language === 'fr' ? '🇬🇧' : '🇫🇷'}</span>
              {t.switchLanguage}
            </button>
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