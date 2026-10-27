import { ArrowRight, Code2, Link2 } from 'lucide-react';
import { Link } from 'wouter';
import type { FooterContentItem } from '@/components/sendflow-footer';
import { getLocalizedPath, type PublicLocale } from '@/lib/localized-routes';

type FeatureActionCardsProps = {
  content: FooterContentItem[];
  language: PublicLocale;
  animated?: boolean;
};

function readContent(
  content: FooterContentItem[],
  key: string,
  locale: PublicLocale,
  fallback: string,
) {
  return content.find((item) => item.contentKey === key && item.locale === locale && item.isVisible)?.value ?? fallback;
}

function safeLocalHref(value: string, fallback: string) {
  const candidate = value.trim();
  if (/^#[A-Za-z0-9_-]+$/.test(candidate)) return candidate;
  if (candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('\\') && !/\s/.test(candidate)) return candidate;
  return fallback;
}

export default function FeatureActionCards({ content, language, animated = true }: FeatureActionCardsProps) {
  const read = (key: string, fallback: string) => readContent(content, key, language, fallback);
  const paymentLinkFallback = getLocalizedPath('/download', language);
  const paymentLinkHref = safeLocalHref(
    read('feature.payment-link.href', paymentLinkFallback),
    paymentLinkFallback,
  );
  const developerApiHref = safeLocalHref(
    read('feature.api-integration.href', '#developer-api'),
    '#developer-api',
  );

  return (
    <div
      id="feature-action-cards"
      className={`${animated ? 'reveal ' : ''}mx-auto mt-8 grid w-full max-w-[1240px] gap-5 sm:grid-cols-2`}
      role="group"
      aria-label={language === 'fr' ? 'Fonctionnalités supplémentaires' : 'Additional features'}
    >
      <article className="flex min-h-[360px] flex-col items-center rounded-[24px] border border-[#e4e3eb] bg-white px-7 py-8 text-center shadow-[0_14px_36px_rgba(35,40,60,.08)] transition-transform hover:-translate-y-1 sm:px-10">
        <div className="grid h-[72px] w-[72px] place-items-center rounded-[18px] bg-[#f1edfa] text-[#6d35d8]">
          <Link2 size={32} strokeWidth={2} aria-hidden="true" />
        </div>
        <h3 className="mt-6 text-[20px] font-extrabold tracking-[-.035em] text-[#17131f]">
          {read('feature.payment-link.title', language === 'fr' ? 'Créer un lien de paiement' : 'Create a payment link')}
        </h3>
        <p className="mt-3 max-w-[360px] text-[16px] font-medium leading-7 text-[#5d5965]">
          {read('feature.payment-link.body', language === 'fr'
            ? 'Aucun code. Sans tracas. Partagez votre lien de paiement pour faciliter l’encaissement.'
            : 'No code. No hassle. Share your payment link to make collecting payments easier.')}
        </p>
        <Link
          href={paymentLinkHref}
          className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-[#4c0fa8] px-6 py-3 text-[14px] font-bold !text-white shadow-[0_10px_20px_rgba(76,15,168,.18)] transition-colors hover:bg-[#3c0c86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d35d8]"
        >
          {read('feature.payment-link.cta', language === 'fr' ? 'Créer un lien' : 'Create a link')}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </article>

      <article className="flex min-h-[360px] flex-col items-center rounded-[24px] border border-[#e4e3eb] bg-white px-7 py-8 text-center shadow-[0_14px_36px_rgba(35,40,60,.08)] transition-transform hover:-translate-y-1 sm:px-10">
        <div className="grid h-[72px] w-[72px] place-items-center rounded-[18px] bg-[#f1edfa] text-[#6d35d8]">
          <Code2 size={32} strokeWidth={2} aria-hidden="true" />
        </div>
        <h3 className="mt-6 text-[20px] font-extrabold tracking-[-.035em] text-[#17131f]">
          {read('feature.api-integration.title', language === 'fr' ? 'Intégration via API' : 'API integration')}
        </h3>
        <p className="mt-3 max-w-[360px] text-[16px] font-medium leading-7 text-[#5d5965]">
          {read('feature.api-integration.body', language === 'fr'
            ? 'Connectez vos applications aux services SendFlow grâce à l’API développeur.'
            : 'Connect your applications to SendFlow services through the developer API.')}
        </p>
        <a
          href={developerApiHref}
          className="mt-auto inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-[#4c0fa8] px-6 py-3 text-[14px] font-bold !text-white shadow-[0_10px_20px_rgba(76,15,168,.18)] transition-colors hover:bg-[#3c0c86] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d35d8]"
        >
          {read('feature.api-integration.cta', language === 'fr' ? 'Voir la documentation' : 'View the documentation')}
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </article>
    </div>
  );
}
