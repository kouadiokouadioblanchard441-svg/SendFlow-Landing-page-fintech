import { useState } from 'react';
import { Link } from 'wouter';
import sendflowMark from '@assets/sendflow-mark-original.png';
import sendflowWordmark from '@assets/sendflow-wordmark-original.png';
import { ProtectedImage } from '@/components/protected-image';
import { getLocaleFromPath, getLocalizedPath, navigateToLocale } from '@/lib/localized-routes';
import { getTelHref, getWhatsAppHref } from '@/lib/contact';

type LegalPage = {
  slug: string;
  titleFr: string;
  titleEn: string;
  introFr: string;
  introEn: string;
};

type LegalSection = {
  sectionNumber: number;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
};

type LegalSettings = {
  companyName: string;
  legalForm: string;
  legalAddress: string;
  legalEmail: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  whatsappNumber?: string | null;
};

function renderLegalBody(body: string) {
  const blocks = body.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);

  return blocks.map((block, blockIndex) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const isUnorderedList = lines.length > 0 && lines.every((line) => /^[-•]\s+/.test(line));
    const isOrderedList = lines.length > 0 && lines.every((line) => /^\d+[.)]\s+/.test(line));

    if (isUnorderedList) {
      return (
        <ul key={`list-${blockIndex}`} className="list-disc space-y-2 pl-8 text-left marker:text-[#7c3aed]">
          {lines.map((line, lineIndex) => <li key={`${blockIndex}-${lineIndex}`}>{line.replace(/^[-•]\s+/, '')}</li>)}
        </ul>
      );
    }

    if (isOrderedList) {
      return (
        <ol key={`ordered-list-${blockIndex}`} className="list-decimal space-y-2 pl-8 text-left marker:text-[#7c3aed]">
          {lines.map((line, lineIndex) => <li key={`${blockIndex}-${lineIndex}`}>{line.replace(/^\d+[.)]\s+/, '')}</li>)}
        </ol>
      );
    }

    return (
      <p key={`paragraph-${blockIndex}`}>
        {lines.map((line, lineIndex) => <span key={`${blockIndex}-${lineIndex}`}>{line}{lineIndex < lines.length - 1 && <br />}</span>)}
      </p>
    );
  });
}

export function EditableLegalPage({
  page,
  sections,
  settings,
}: {
  page: LegalPage;
  sections: LegalSection[];
  settings: LegalSettings | null;
}) {
  const [locale] = useState<'fr' | 'en'>(() => getLocaleFromPath(window.location.pathname));
  const isFrench = locale === 'fr';
  const companyName = settings?.companyName || 'Flow Digital SARL';
  const address = settings?.legalAddress || 'Immeuble Horizon, Boulevard Latrille, Cocody, Abidjan, Côte d’Ivoire';
  const email = settings?.legalEmail || 'legal@sendflow.studio';
  const contactEmail = settings?.contactEmail || email;
  const contactPhoneHref = getTelHref(settings?.contactPhone);
  const whatsappHref = getWhatsAppHref(settings?.whatsappNumber);
  const title = isFrench ? page.titleFr : page.titleEn;
  const intro = isFrench ? page.introFr : page.introEn;

  return (
    <div className="sendflow-legal-page min-h-screen bg-white text-[#1d1d1f]">
      <header className="sticky top-0 z-40 border-b border-[#e5e7eb] bg-white/95 px-3 py-3 shadow-sm backdrop-blur-md md:px-10">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4">
          <Link href={getLocalizedPath('/', locale)} className="flex items-center gap-2" aria-label={isFrench ? 'Retour à SendFlow' : 'Back to SendFlow'}>
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white"><ProtectedImage src={sendflowMark} alt="" className="h-8 w-7 object-contain" /></span>
            <ProtectedImage src={sendflowWordmark} alt="SendFlow" className="h-6 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigateToLocale(window.location.pathname, isFrench ? 'en' : 'fr')}
              aria-label={isFrench ? 'Passer en anglais' : 'Passer en français'}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#1d1d1f]/15 bg-white px-2.5 py-2 text-[11px] font-bold transition-colors hover:border-[#7c3aed] hover:text-[#7c3aed] sm:px-3"
            >
              <span aria-hidden="true" className="text-[15px] leading-none">{isFrench ? '🇫🇷' : '🇬🇧'}</span>
              <span>{isFrench ? 'FR' : 'EN'}</span>
            </button>
            <Link href={getLocalizedPath('/', locale)} className="inline-flex min-w-[144px] items-center justify-center rounded-full bg-[#7c3aed] px-3 py-2.5 text-center text-[11px] font-bold text-white transition-colors hover:bg-[#6d28d9] sm:min-w-[164px] sm:px-5 sm:text-[12px]">
              {isFrench ? 'Retour à l’accueil' : 'Back to home'}
            </Link>
          </div>
        </div>
      </header>
      <main className="px-4 pb-20 pt-12 sm:px-8 sm:pt-16">
        <article className="mx-auto max-w-[760px]">
          <div className="mb-10">
            <p className="font-worksans text-[11px] font-bold uppercase tracking-[.16em] text-[#7c3aed]">SendFlow · {isFrench ? 'Document légal' : 'Legal document'}</p>
            <h1 className="mt-5 break-words text-left text-[30px] font-bold leading-tight tracking-[-.025em] text-[#1d1d1f] sm:text-[42px]">{title}</h1>
            <p className="mt-5 text-justify text-[15px] leading-7 text-[#666] sm:text-base">{intro}</p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-y border-[#e5e7eb] py-4 text-[13px] text-[#666]">
              <span><strong className="text-[#1d1d1f]">{isFrench ? 'Version' : 'Version'} :</strong> {isFrench ? '17 septembre 2026' : 'September 17, 2026'}</span>
              <span><strong className="text-[#1d1d1f]">{isFrench ? 'Contact' : 'Contact'} :</strong> {contactEmail}</span>
            </div>
          </div>

          <nav aria-label={isFrench ? 'Sommaire du document' : 'Document contents'} className="mb-14 border-b border-[#e5e7eb] pb-8">
            <p className="mb-4 text-[12px] font-bold uppercase tracking-[.12em] text-[#1d1d1f]">{isFrench ? 'Sommaire' : 'Contents'}</p>
            <ol className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
              {sections.map((section) => (
                <li key={`contents-${section.sectionNumber}`} className="text-[14px] leading-6 text-[#666]">
                  <a href={`#legal-section-${section.sectionNumber}`} className="transition-colors hover:text-[#7c3aed]">
                    <span className="mr-2 font-bold text-[#7c3aed]">{section.sectionNumber}.</span>
                    {isFrench ? section.titleFr : section.titleEn}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-12">
            {sections.map((section) => (
              <section id={`legal-section-${section.sectionNumber}`} key={`${section.sectionNumber}-${section.titleFr}`} className="scroll-mt-28">
                <h2 className="border-t border-[#e5e7eb] pt-7 text-left text-[20px] font-semibold uppercase leading-tight text-[#1d1d1f]">{section.sectionNumber}. {isFrench ? section.titleFr : section.titleEn}</h2>
                <div className="sendflow-legal-body mt-4 space-y-4 text-[15px] leading-[1.65] text-[#666] sm:text-base">
                  {renderLegalBody(isFrench ? section.bodyFr : section.bodyEn)}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 border-t border-[#e5e7eb] pt-6 text-[14px] leading-6 text-[#666]">
            <p className="font-bold text-[#1d1d1f]">{companyName} · {settings?.legalForm || 'Société à responsabilité limitée'}</p>
            <p>{address}</p>
            <a href={`mailto:${contactEmail}`} className="font-semibold text-[#2563eb] hover:underline">{contactEmail}</a>
            {contactPhoneHref && <a href={contactPhoneHref} className="ml-4 font-semibold text-[#2563eb] hover:underline">{settings?.contactPhone}</a>}
            {whatsappHref && <a href={whatsappHref} target="_blank" rel="noreferrer" className="ml-4 font-semibold text-[#2563eb] hover:underline">WhatsApp</a>}
          </div>
        </article>
      </main>
      <footer className="border-t border-[#e5e7eb] bg-white px-4 py-8 sm:px-8">
        <div className="mx-auto flex max-w-[760px] flex-wrap gap-4 text-[12px] text-[#666]">
          <Link href="/" className="font-semibold text-[#7c3aed]">{isFrench ? 'Accueil' : 'Home'}</Link>
          <Link href="/conditions-utilisation" className="hover:text-[#7c3aed]">{isFrench ? 'Conditions' : 'Terms'}</Link>
          <Link href="/confidentialite" className="hover:text-[#7c3aed]">{isFrench ? 'Confidentialité' : 'Privacy'}</Link>
          <Link href="/mentions-legales" className="hover:text-[#7c3aed]">{isFrench ? 'Mentions légales' : 'Legal notice'}</Link>
        </div>
      </footer>
    </div>
  );
}
