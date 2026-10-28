import './_group.css';
import { useState } from 'react';
import { Landmark, Minus, Plus } from 'lucide-react';

type FeeOperatorDisplay = {
  slug: string;
  name: string;
  logoUrl: string | null;
  background: string | null;
  foreground: string | null;
  collectionPercent: number;
  transferPercent: number;
};

type FeeSectionConfig = {
  collectionTitle: string;
  transferTitle: string;
  bankTransferLabel: string;
  bankTransferAmountXof: number;
  operators: FeeOperatorDisplay[];
};

function formatPercent(value: number) {
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)}%`;
}

function formatXof(value: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value);
}

function OperatorMark({ operator }: { operator: FeeOperatorDisplay }) {
  const initials = operator.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const hasLogo = Boolean(operator.logoUrl);

  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden sm:h-11 sm:w-11 ${
        hasLogo
          ? 'rounded-[13px] border border-[#e6def3] bg-white p-1 shadow-[0_2px_5px_rgba(58,38,83,.08)]'
          : 'rounded-full border-2 border-[#e6def3] bg-[#f3f0fa] text-[11px] font-extrabold tracking-tight text-[#6d35d8]'
      }`}
      style={hasLogo ? undefined : {
        backgroundColor: operator.background || undefined,
        color: operator.foreground || undefined,
      }}
    >
      {operator.logoUrl ? (
        <img
          src={operator.logoUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-contain"
        />
      ) : (
        initials
      )}
    </span>
  );
}

function OperatorFeesSection({
  language,
  config,
}: {
  language: 'fr' | 'en';
  config: FeeSectionConfig;
}) {
  const [collectionOpen, setCollectionOpen] = useState(true);
  const [transferOpen, setTransferOpen] = useState(true);
  const collectionPanelId = 'operator-fees-collection-panel';
  const transferPanelId = 'operator-fees-transfer-panel';

  return (
    <section
      id="operator-fees"
      aria-label={language === 'fr' ? 'Tarifs des opérateurs' : 'Operator fees'}
      className="px-5 py-12 sm:px-8 sm:py-16"
    >
      <div className="mx-auto max-w-[1040px]">
        <div className="grid gap-5">
          <article className="overflow-hidden rounded-[18px] border-2 border-[#17202d] bg-white shadow-[0_5px_0_#17202d,0_12px_20px_rgba(23,32,45,.12)] transition-[border-color,box-shadow] duration-200 hover:shadow-[0_7px_0_#17202d,0_16px_24px_rgba(23,32,45,.16)] focus-within:border-[#6d35d8]">
            <h2 className="m-0">
              <button
                type="button"
                aria-expanded={collectionOpen}
                aria-controls={collectionPanelId}
                onClick={() => setCollectionOpen((open) => !open)}
                className="flex min-h-[88px] w-full items-center justify-between gap-5 px-6 py-5 text-left transition-colors hover:bg-[#faf7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d35d8] sm:px-10"
              >
                <span className="text-[20px] font-bold leading-tight tracking-[-.035em] text-[#17202d] sm:text-[25px]">
                  {config.collectionTitle}
                </span>
                {collectionOpen ? (
                  <Minus size={22} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-[#687384]" />
                ) : (
                  <Plus size={22} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-[#687384]" />
                )}
              </button>
            </h2>
            <div
              id={collectionPanelId}
              hidden={!collectionOpen}
              className="border-t-2 border-[#17202d] px-5 py-5 sm:px-8 sm:py-6"
            >
              <div className="grid grid-cols-1 gap-2 rounded-[16px] border-2 border-[#17202d] bg-[#f0f4ff] p-3 shadow-[0_4px_0_#17202d] min-[360px]:grid-cols-2 sm:gap-4 sm:p-5 lg:grid-cols-3">
                {config.operators.map((operator) => (
                  <div
                    key={operator.slug}
                    className="flex min-h-[86px] min-w-0 items-center gap-2 rounded-[13px] border-2 border-[#17202d] bg-white px-2.5 py-3 shadow-[0_4px_0_#17202d,0_7px_12px_rgba(23,32,45,.08)] sm:gap-3 sm:px-4"
                  >
                    <OperatorMark operator={operator} />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 whitespace-normal break-words text-[13px] font-semibold leading-4 text-[#17202d] sm:text-[14px] sm:leading-5">
                        {operator.name}
                      </p>
                      <p className="m-0 mt-0.5 font-mono text-[13px] font-medium tabular-nums text-[#657184]">
                        {formatPercent(operator.collectionPercent)}
                      </p>
                    </div>
                  </div>
                ))}
                {config.operators.length === 0 && (
                  <p className="col-span-full m-0 rounded-xl border-2 border-[#17202d] bg-white px-4 py-6 text-center text-sm font-medium text-[#657184] shadow-[0_4px_0_#17202d]">
                    {language === 'fr' ? 'Les tarifs seront affichés ici.' : 'Fees will appear here.'}
                  </p>
                )}
              </div>
            </div>
          </article>

          <article className="overflow-hidden rounded-[18px] border-2 border-[#17202d] bg-white shadow-[0_5px_0_#17202d,0_12px_20px_rgba(23,32,45,.12)] transition-[border-color,box-shadow] duration-200 hover:shadow-[0_7px_0_#17202d,0_16px_24px_rgba(23,32,45,.16)] focus-within:border-[#6d35d8]">
            <h2 className="m-0">
              <button
                type="button"
                aria-expanded={transferOpen}
                aria-controls={transferPanelId}
                onClick={() => setTransferOpen((open) => !open)}
                className="flex min-h-[88px] w-full items-center justify-between gap-5 px-6 py-5 text-left transition-colors hover:bg-[#faf7ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6d35d8] sm:px-10"
              >
                <span className="text-[20px] font-bold leading-tight tracking-[-.035em] text-[#17202d] sm:text-[25px]">
                  {config.transferTitle}
                </span>
                {transferOpen ? (
                  <Minus size={22} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-[#687384]" />
                ) : (
                  <Plus size={22} strokeWidth={1.8} aria-hidden="true" className="shrink-0 text-[#687384]" />
                )}
              </button>
            </h2>
            <div
              id={transferPanelId}
              hidden={!transferOpen}
              className="border-t-2 border-[#17202d] px-5 py-5 sm:px-8 sm:py-6"
            >
              <div className="grid grid-cols-1 gap-2 rounded-[16px] border-2 border-[#17202d] bg-[#f0f4ff] p-3 shadow-[0_4px_0_#17202d] min-[360px]:grid-cols-2 sm:gap-4 sm:p-5 lg:grid-cols-3">
                {config.operators.map((operator) => (
                  <div
                    key={operator.slug}
                    className="flex min-h-[86px] min-w-0 items-center gap-2 rounded-[13px] border-2 border-[#17202d] bg-white px-2.5 py-3 shadow-[0_4px_0_#17202d,0_7px_12px_rgba(23,32,45,.08)] sm:gap-3 sm:px-4"
                  >
                    <OperatorMark operator={operator} />
                    <div className="min-w-0 flex-1">
                      <p className="m-0 whitespace-normal break-words text-[13px] font-semibold leading-4 text-[#17202d] sm:text-[14px] sm:leading-5">
                        {operator.name}
                      </p>
                      <p className="m-0 mt-0.5 font-mono text-[13px] font-medium tabular-nums text-[#657184]">
                        {formatPercent(operator.transferPercent)}
                      </p>
                    </div>
                  </div>
                ))}
                <div className="flex min-h-[86px] min-w-0 items-center gap-2 rounded-[13px] border-2 border-[#17202d] bg-white px-2.5 py-3 shadow-[0_4px_0_#17202d,0_7px_12px_rgba(23,32,45,.08)] sm:gap-3 sm:px-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#edf1f7] text-[#27374c] sm:h-11 sm:w-11">
                    <Landmark size={20} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="m-0 whitespace-normal break-words text-[13px] font-semibold leading-4 text-[#17202d] sm:text-[14px] sm:leading-5">
                      {config.bankTransferLabel}
                    </p>
                    <p className="m-0 mt-0.5 font-mono text-[13px] font-semibold tabular-nums text-[#657184]">
                      {formatXof(config.bankTransferAmountXof)} F CFA
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

export function Current() {
  const config: FeeSectionConfig = {
    collectionTitle: "Frais à l'encaissement",
    transferTitle: 'Frais de transfert',
    bankTransferLabel: 'Banque',
    bankTransferAmountXof: 1000,
    operators: [
      { slug: 'orange', name: 'Orange', logoUrl: '/__mockup/images/sendflow-operators/orange.png', background: '#ff7900', foreground: '#ffffff', collectionPercent: 3, transferPercent: 2.6 },
      { slug: 'mtn', name: 'MTN', logoUrl: '/__mockup/images/sendflow-operators/mtn-momo.png', background: '#ffca05', foreground: '#17131f', collectionPercent: 3, transferPercent: 2.6 },
      { slug: 'moov-africa', name: 'Moov Africa', logoUrl: '/__mockup/images/sendflow-operators/moov-africa.png', background: '#e83e8c', foreground: '#ffffff', collectionPercent: 3, transferPercent: 2.6 },
      { slug: 'wave', name: 'Wave', logoUrl: '/__mockup/images/sendflow-operators/wave.png', background: '#1769ff', foreground: '#ffffff', collectionPercent: 3, transferPercent: 2.6 },
    ],
  };

  return (
    <main className="min-h-screen bg-white font-sans">
      <OperatorFeesSection language="fr" config={config} />
    </main>
  );
}
