import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Headphones, Mail, MessageCircle, Phone, X } from 'lucide-react';
import { getTelHref, getWhatsAppHref } from '@/lib/contact';

export type SupportChatSettings = {
  supportEmail?: string | null;
  supportPhone?: string | null;
  whatsappUrl?: string | null;
  homeContactEmail?: string | null;
  homeContactPhone?: string | null;
  homeContactWhatsapp?: string | null;
  featuresContactEmail?: string | null;
  featuresContactPhone?: string | null;
  featuresContactWhatsapp?: string | null;
  securityContactEmail?: string | null;
  securityContactPhone?: string | null;
  securityContactWhatsapp?: string | null;
  downloadContactEmail?: string | null;
  downloadContactPhone?: string | null;
  downloadContactWhatsapp?: string | null;
  aboutContactEmail?: string | null;
  aboutContactPhone?: string | null;
  aboutContactWhatsapp?: string | null;
  legalContactEmail?: string | null;
  legalContactPhone?: string | null;
  legalContactWhatsapp?: string | null;
};

type SupportChatProps = {
  locale: 'fr' | 'en';
  settings?: SupportChatSettings | null;
  page: 'home' | 'features' | 'security' | 'download' | 'about' | 'legal' | 'other';
  /** Integration seam only: callers may provide a real support adapter in the future. */
  onSend?: (message: string) => void | Promise<void>;
};

const copy = {
  fr: {
    open: 'Ouvrir l’assistance SendFlow',
    close: 'Fermer l’assistance',
    title: 'On vous écoute.',
    subtitle: 'Assistance SendFlow',
    unavailable: 'La messagerie directe n’est pas encore connectée.',
    next: 'En attendant, choisissez un canal de contact disponible.',
    noChannels: 'Aucun canal de contact n’est configuré pour le moment.',
    email: 'Écrire un e-mail',
    call: 'Appeler',
    whatsapp: 'Ouvrir WhatsApp',
    message: 'Votre message',
    placeholder: 'La messagerie directe sera bientôt disponible.',
    send: 'Envoyer',
    sendUnavailable: 'Envoi indisponible',
    draft: 'Cette zone ne transmet pas de message.',
    online: 'Aucune réponse instantanée',
  },
  en: {
    open: 'Open SendFlow support',
    close: 'Close support',
    title: 'We’re listening.',
    subtitle: 'SendFlow support',
    unavailable: 'Direct chat isn’t connected yet.',
    next: 'For now, choose an available contact channel.',
    noChannels: 'No contact channel is configured right now.',
    email: 'Email support',
    call: 'Call support',
    whatsapp: 'Open WhatsApp',
    message: 'Your message',
    placeholder: 'Direct messaging will be available soon.',
    send: 'Send',
    sendUnavailable: 'Sending unavailable',
    draft: 'This field does not transmit messages.',
    online: 'No instant replies',
  },
} as const;

export function PublicSupportChat({ locale, settings, page, onSend }: SupportChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const launcherRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const text = copy[locale];
  const scope = page === 'other' ? '' : page === 'home' ? 'home' : page;
  const override = (field: 'Email' | 'Phone' | 'Whatsapp') =>
    scope ? settings?.[`${scope}Contact${field}` as keyof SupportChatSettings] : null;
  const email = override('Email')?.trim() || settings?.supportEmail?.trim() || '';
  const phone = override('Phone')?.trim() || settings?.supportPhone?.trim() || '';
  const pageWhatsapp = override('Whatsapp')?.trim() || '';
  const whatsappHref = pageWhatsapp
    ? getWhatsAppHref(pageWhatsapp)
    : settings?.whatsappUrl?.trim() || '';
  const phoneHref = getTelHref(phone);
  const channels = [
    email ? { key: 'email', label: text.email, href: `mailto:${email}`, icon: Mail } : null,
    phoneHref ? { key: 'phone', label: text.call, href: phoneHref, icon: Phone } : null,
    whatsappHref ? { key: 'whatsapp', label: text.whatsapp, href: whatsappHref, icon: MessageCircle } : null,
  ].filter((channel): channel is NonNullable<typeof channel> => channel !== null);

  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (onSend && draft.trim()) {
      void onSend(draft.trim());
      setDraft('');
    }
  };

  return (
    <div className="sf-support" data-testid="widget-public-support">
      {isOpen && (
        <section
          id="sf-support-panel"
          className="sf-support-panel"
          role="dialog"
          aria-labelledby="sf-support-title"
          aria-describedby="sf-support-status"
          data-testid="panel-support-chat"
        >
          <header className="sf-support-header">
            <span className="sf-support-mark" aria-hidden="true"><Headphones size={19} strokeWidth={2.3} /></span>
            <div className="sf-support-heading">
              <span className="sf-support-eyebrow">{text.subtitle}</span>
              <h2 id="sf-support-title">{text.title}</h2>
            </div>
            <button
              ref={closeRef}
              type="button"
              className="sf-support-close"
              aria-label={text.close}
              onClick={() => {
                setIsOpen(false);
                launcherRef.current?.focus();
              }}
              data-testid="button-close-support"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="sf-support-body">
            <div className="sf-support-notice" id="sf-support-status" role="status" data-testid="status-chat-unavailable">
              <span className="sf-support-status-dot" aria-hidden="true" />
              <span>{text.unavailable}</span>
            </div>
            <p className="sf-support-copy">{text.next}</p>
            {channels.length > 0 ? (
              <nav className="sf-support-channels" aria-label={locale === 'fr' ? 'Canaux de contact disponibles' : 'Available contact channels'}>
                {channels.map(({ key, label, href, icon: Icon }) => (
                  <a
                    key={key}
                    className="sf-support-channel"
                    href={href}
                    target={key === 'whatsapp' ? '_blank' : undefined}
                    rel={key === 'whatsapp' ? 'noreferrer' : undefined}
                    data-testid={`link-support-${key}`}
                  >
                    <span className="sf-support-channel-icon"><Icon size={17} aria-hidden="true" /></span>
                    <span>{label}</span>
                    <ArrowUpRight className="sf-support-channel-arrow" size={15} aria-hidden="true" />
                  </a>
                ))}
              </nav>
            ) : (
              <p className="sf-support-empty" data-testid="text-no-support-channels">{text.noChannels}</p>
            )}
            <form className="sf-support-compose" onSubmit={submit}>
              <label htmlFor="sf-support-message">{text.message}</label>
              <textarea
                id="sf-support-message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={text.placeholder}
                disabled={!onSend}
                rows={2}
                aria-describedby="sf-support-compose-note"
                data-testid="input-support-message"
              />
              <div className="sf-support-compose-bottom">
                <span id="sf-support-compose-note">{onSend ? text.send : text.draft}</span>
                <button type="submit" disabled={!onSend || !draft.trim()} aria-label={onSend ? text.send : text.sendUnavailable} data-testid="button-send-support-message">
                  {text.send}
                </button>
              </div>
            </form>
            <p className="sf-support-footnote" data-testid="text-support-response-note">{text.online}</p>
          </div>
        </section>
      )}
      <button
        ref={launcherRef}
        type="button"
        className={`sf-support-launcher${isOpen ? ' is-open' : ''}`}
        aria-label={isOpen ? text.close : text.open}
        aria-expanded={isOpen}
        aria-controls="sf-support-panel"
        onClick={() => setIsOpen((open) => !open)}
        data-testid="button-open-support"
      >
        {isOpen ? <X size={21} aria-hidden="true" /> : <MessageCircle size={22} strokeWidth={2.2} aria-hidden="true" />}
        {!isOpen && <span className="sf-support-launcher-label">{locale === 'fr' ? 'Besoin d’aide ?' : 'Need a hand?'}</span>}
      </button>
    </div>
  );
}
