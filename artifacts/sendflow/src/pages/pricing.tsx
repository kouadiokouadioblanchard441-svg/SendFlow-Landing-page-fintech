import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CircleHelp, Landmark } from 'lucide-react';
import { Link } from 'wouter';
import { useSeo } from '@/lib/seo';
import { getLocaleFromPath, getLocalizedPath } from '@/lib/localized-routes';
import publicSeoRoutes from '@/lib/public-seo-routes.json';
import { OPERATOR_FEES_CONTENT_KEY, parseOperatorFeesConfig } from '@/lib/operator-fees';

type PricingBundle = {
  content: Array<{
    contentKey: string;
    locale: string;
    value: string;
    isVisible: boolean;
    updatedAt?: string;
  }>;
  countries: Array<{
    id: number;
    code: string;
    nameFr: string;
    nameEn: string;
    flag: string;
    isVisible: boolean;
  }>;
  operators: Array<{
    id: number;
    slug: string;
    name: string;
    isVisible: boolean;
  }>;
  countryOperators: Array<{ countryId: number; operatorId: number }>;
};

export default function PricingPage() {
  const locale = getLocaleFromPath(window.location.pathname);
  const isFrench = locale === 'fr';
  const route = publicSeoRoutes.pricing[locale];
  const { data, isLoading, isError } = useQuery<PricingBundle>({
    queryKey: ['/api/landing'],
    queryFn: async () => {
      const response = await fetch('/api/landing');
      if (!response.ok) throw new Error('Landing content unavailable');
      return response.json() as Promise<PricingBundle>;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  useSeo({
    path: route.path,
    locale,
    title: route.title,
    description: route.description,
    imagePath: '/sendflow-favicon.png',
    breadcrumbs: [
      { name: isFrench ? 'Accueil' : 'Home', path: '/' },
      { name: route.name, path: route.path },
    ],
  });

  const feeContent = data?.content.find((item) =>
    item.contentKey === OPERATOR_FEES_CONTENT_KEY && item.locale === 'fr' && item.isVisible,
  );
  const feeConfig = parseOperatorFeesConfig(feeContent?.value);
  const country = data?.countries.find((item) => item.code === 'CI' && item.isVisible);
  const associatedOperatorIds = new Set(
    data?.countryOperators.filter((item) => item.countryId === country?.id).map((item) => item.operatorId) ?? [],
  );
  const operators = (data?.operators ?? [])
    .filter((operator) => operator.isVisible && associatedOperatorIds.has(operator.id))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  const rates = new Map(feeConfig?.operators.map((operator) => [operator.slug, operator]) ?? []);
  const scheduleIsComplete = Boolean(
    feeConfig &&
    country &&
    operators.length > 0 &&
    operators.every((operator) => rates.has(operator.slug)),
  );
  const updatedAt = feeContent?.updatedAt ? new Date(feeContent.updatedAt) : null;
  const lastUpdated = updatedAt && Number.isFinite(updatedAt.getTime())
    ? new Intl.DateTimeFormat(isFrench ? 'fr-FR' : 'en-GB', { dateStyle: 'long' }).format(updatedAt)
    : null;
  const formatPercent = (value: number) =>
    `${new Intl.NumberFormat(isFrench ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 2 }).format(value)}%`;
  const formatXof = (value: number) =>
    `${new Intl.NumberFormat(isFrench ? 'fr-FR' : 'en-GB', { maximumFractionDigits: 0 }).format(value)} XOF`;

  return (
    <main className="min-h-screen bg-[#f8f7fb] px-5 py-10 text-[#211d2c] sm:px-8 sm:py-16">
      <article className="mx-auto max-w-5xl">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[#5b21b6] underline" href={getLocalizedPath('/', locale)}>
          <ArrowLeft size={16} aria-hidden="true" />
          {isFrench ? 'Accueil SendFlow' : 'SendFlow home'}
        </Link>
        <header className="mt-10 max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#6d35d8]">
            {isFrench ? 'Barème public des frais' : 'Published fee schedule'}
          </p>
          <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-[-.05em] sm:text-6xl">
            {route.name} SendFlow
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#4b4655]">
            {isFrench
              ? 'Les frais publiés pour les opérateurs associés à la Côte d’Ivoire sont présentés séparément par type de service. Les tarifs restent modifiables dans l’administration SendFlow.'
              : 'Published fees for operators associated with Côte d’Ivoire are listed separately by service type. Rates remain editable in the SendFlow admin panel.'}
          </p>
        </header>

        <section className="mt-9 grid gap-4 sm:grid-cols-3" aria-label={isFrench ? 'Couverture du barème' : 'Schedule coverage'}>
          <div className="rounded-2xl border border-[#e5dfef] bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#767080]">{isFrench ? 'Pays couvert' : 'Country covered'}</p>
            <p className="mt-2 text-lg font-extrabold">
              {country ? `${country.flag} ${isFrench ? country.nameFr : country.nameEn}` : '—'}
            </p>
          </div>
          <div className="rounded-2xl border border-[#e5dfef] bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#767080]">{isFrench ? 'Types de frais' : 'Fee types'}</p>
            <p className="mt-2 text-lg font-extrabold">{isFrench ? 'Pourcentage et montant fixe' : 'Percentage and flat amount'}</p>
          </div>
          <div className="rounded-2xl border border-[#e5dfef] bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#767080]">{isFrench ? 'Dernière mise à jour' : 'Last updated'}</p>
            <p className="mt-2 text-lg font-extrabold">{lastUpdated ?? '—'}</p>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[#e5dfef] bg-white shadow-sm" aria-labelledby="published-fees-title">
          <div className="border-b border-[#ece8f2] px-5 py-5 sm:px-7">
            <h2 id="published-fees-title" className="text-2xl font-extrabold tracking-tight">
              {isFrench ? 'Frais par opérateur' : 'Fees by operator'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#595466]">
              {isFrench
                ? 'Les pourcentages sont distincts des frais bancaires fixes, exprimés en XOF.'
                : 'Percentages are separate from fixed bank fees, which are stated in XOF.'}
            </p>
          </div>

          {isLoading ? (
            <p className="px-5 py-8 text-sm text-[#595466]" role="status">
              {isFrench ? 'Chargement du barème publié…' : 'Loading published fees…'}
            </p>
          ) : isError ? (
            <p className="px-5 py-8 text-sm text-[#8f2929]" role="alert">
              {isFrench ? 'Le barème est momentanément indisponible.' : 'The fee schedule is temporarily unavailable.'}
            </p>
          ) : scheduleIsComplete && feeConfig ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-left">
                <thead className="bg-[#f5f3f9] text-xs uppercase tracking-wide text-[#5b5665]">
                  <tr>
                    <th scope="col" className="px-5 py-4 sm:px-7">{isFrench ? 'Opérateur / mode' : 'Operator / method'}</th>
                    <th scope="col" className="px-5 py-4">{isFrench ? 'Encaissement' : 'Collection'}</th>
                    <th scope="col" className="px-5 py-4">{isFrench ? 'Transfert' : 'Transfer'}</th>
                    <th scope="col" className="px-5 py-4">{isFrench ? 'Limites publiées' : 'Published limits'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ece8f2] text-sm">
                  {operators.map((operator) => {
                    const rate = rates.get(operator.slug)!;
                    return (
                      <tr key={operator.slug}>
                        <th scope="row" className="px-5 py-4 font-bold sm:px-7">{operator.name}</th>
                        <td className="px-5 py-4 tabular-nums">{formatPercent(rate.collectionPercent)}</td>
                        <td className="px-5 py-4 tabular-nums">{formatPercent(rate.transferPercent)}</td>
                        <td className="px-5 py-4 text-[#6f6978]">{isFrench ? 'Non précisées' : 'Not specified'}</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <th scope="row" className="px-5 py-4 font-bold sm:px-7">
                      <span className="inline-flex items-center gap-2"><Landmark size={16} aria-hidden="true" />{isFrench ? feeConfig.bankTransferLabelFr : feeConfig.bankTransferLabelEn}</span>
                    </th>
                    <td className="px-5 py-4 text-[#6f6978]">—</td>
                    <td className="px-5 py-4 font-semibold tabular-nums">{formatXof(feeConfig.bankTransferAmountXof)}</td>
                    <td className="px-5 py-4 text-[#6f6978]">{isFrench ? 'Non précisées' : 'Not specified'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-sm leading-7 text-[#595466]" role="status">
              {isFrench
                ? 'Aucun barème complet n’est actuellement publié. Aucune valeur estimée ou provisoire ne sera affichée.'
                : 'No complete fee schedule is currently published. Estimated or provisional values are not shown.'}
            </p>
          )}
        </section>

        <aside className="mt-6 flex gap-3 rounded-2xl border border-[#ded7ec] bg-white p-5 text-sm leading-7 text-[#595466]">
          <CircleHelp className="mt-1 shrink-0 text-[#6d35d8]" size={18} aria-hidden="true" />
          <p>
            {isFrench
              ? 'Le barème publié ne précise pas de montant minimum ou maximum. Vérifiez les frais, la devise de l’opération et le montant final affichés dans le parcours concerné avant confirmation.'
              : 'The published schedule does not specify a minimum or maximum amount. Check the applicable fees, transaction currency, and final amount shown in the relevant flow before confirming.'}
          </p>
        </aside>
      </article>
    </main>
  );
}
