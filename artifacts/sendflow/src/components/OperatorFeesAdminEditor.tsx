import { useEffect, useState } from 'react';
import { ChevronDown, LoaderCircle, Save } from 'lucide-react';

export type AdminFeeOperator = {
  slug: string;
  name: string;
};

export type EditableFeeConfig = {
  collectionTitleFr: string;
  collectionTitleEn: string;
  transferTitleFr: string;
  transferTitleEn: string;
  bankTransferLabelFr: string;
  bankTransferLabelEn: string;
  bankTransferAmountXof: number;
  operators: Array<{
    slug: string;
    collectionPercent: number;
    transferPercent: number;
  }>;
};

export type OperatorFeesAdminEditorProps = {
  operators: AdminFeeOperator[];
  value: EditableFeeConfig;
  saving: boolean;
  onSave: (value: EditableFeeConfig) => void;
};

function makeEditableValue(value: EditableFeeConfig, operators: AdminFeeOperator[]): EditableFeeConfig {
  const currentFees = new Map(value.operators.map((operator) => [operator.slug, operator]));
  return {
    ...value,
    operators: operators.map((operator) => ({
      slug: operator.slug,
      collectionPercent: currentFees.get(operator.slug)?.collectionPercent ?? 0,
      transferPercent: currentFees.get(operator.slug)?.transferPercent ?? 0,
    })),
  };
}

export default function OperatorFeesAdminEditor({
  operators,
  value,
  saving,
  onSave,
}: OperatorFeesAdminEditorProps) {
  const [draft, setDraft] = useState(() => makeEditableValue(value, operators));
  const [percentageInputs, setPercentageInputs] = useState<Record<string, {
    collectionPercent: string;
    transferPercent: string;
  }>>(() => Object.fromEntries(draft.operators.map((operator) => [operator.slug, {
    collectionPercent: String(operator.collectionPercent),
    transferPercent: String(operator.transferPercent),
  }])));
  const [bankTransferAmountInput, setBankTransferAmountInput] = useState(String(draft.bankTransferAmountXof));
  const [inputError, setInputError] = useState<string | null>(null);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    const next = makeEditableValue(value, operators);
    setDraft(next);
    setPercentageInputs(Object.fromEntries(next.operators.map((operator) => [operator.slug, {
      collectionPercent: String(operator.collectionPercent),
      transferPercent: String(operator.transferPercent),
    }])));
    setBankTransferAmountInput(String(next.bankTransferAmountXof));
    setInputError(null);
  }, [value, operators]);

  const updateText = (key: keyof Omit<EditableFeeConfig, 'operators' | 'bankTransferAmountXof'>, next: string) => {
    setDraft((current) => ({ ...current, [key]: next }));
  };

  const updateAmount = (next: string) => {
    setBankTransferAmountInput(next);
    setDraft((current) => ({
      ...current,
      bankTransferAmountXof: next === '' ? 0 : Number(next),
    }));
  };

  const updateOperator = (slug: string, field: 'collectionPercent' | 'transferPercent', next: string) => {
    setPercentageInputs((current) => ({
      ...current,
      [slug]: { ...current[slug], [field]: next },
    }));
    const percentage = next === '' ? 0 : Number(next);
    setDraft((current) => ({
      ...current,
      operators: current.operators.map((operator) =>
        operator.slug === slug ? { ...operator, [field]: percentage } : operator,
      ),
    }));
  };

  const titleField = (
    id: string,
    label: string,
    field: keyof Omit<EditableFeeConfig, 'operators' | 'bankTransferAmountXof'>,
  ) => (
    <label className="sendflow-admin-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="text"
        value={draft[field]}
        onChange={(event) => updateText(field, event.target.value)}
        data-testid={`input-${id}`}
      />
    </label>
  );

  const operatorRows = (field: 'collectionPercent' | 'transferPercent', label: string) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {operators.map((operator) => {
        const fee = draft.operators.find((item) => item.slug === operator.slug);
        return (
          <label
            key={operator.slug}
            className="sendflow-admin-field min-w-0 rounded-[15px] border border-[#e6eaf0] bg-white p-4"
            htmlFor={`${field}-${operator.slug}`}
            data-testid={`row-${field}-${operator.slug}`}
          >
            <span className="mb-2 flex items-center justify-between gap-3">
              <span className="truncate text-[13px] font-bold text-[#17202d]">{operator.name}</span>
              <span className="shrink-0 text-[11px] font-semibold text-[#788293]">{label}</span>
            </span>
            <span className="flex items-center gap-2">
              <input
                id={`${field}-${operator.slug}`}
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={percentageInputs[operator.slug]?.[field] ?? String(fee?.[field] ?? 0)}
                onChange={(event) => updateOperator(operator.slug, field, event.target.value)}
                data-testid={`input-${field}-${operator.slug}`}
              />
              <span className="font-mono text-sm font-bold text-[#677386]">%</span>
            </span>
          </label>
        );
      })}
      {operators.length === 0 && (
        <p className="sendflow-admin-muted m-0 rounded-xl border border-dashed border-[#dce2eb] p-5">
          Aucun opérateur disponible.
        </p>
      )}
    </div>
  );

  const submit = () => {
    const next = makeEditableValue(draft, operators);
    const bankAmount = Number(bankTransferAmountInput);
    const nextOperators = next.operators.map((operator) => ({
      ...operator,
      collectionPercent: Number(percentageInputs[operator.slug]?.collectionPercent ?? operator.collectionPercent),
      transferPercent: Number(percentageInputs[operator.slug]?.transferPercent ?? operator.transferPercent),
    }));
    const validPercent = (percent: number) =>
      Number.isFinite(percent) &&
      percent >= 0 &&
      percent <= 100 &&
      Math.abs(percent * 100 - Math.round(percent * 100)) < 1e-8;

    if (
      bankTransferAmountInput.trim() === '' ||
      !Number.isSafeInteger(bankAmount) ||
      bankAmount < 0 ||
      bankAmount > 100_000_000 ||
      nextOperators.some((operator) =>
        !validPercent(operator.collectionPercent) || !validPercent(operator.transferPercent),
      )
    ) {
      setInputError('Vérifie les montants : pourcentages de 0 à 100 avec deux décimales maximum, et montant bancaire en XOF entier.');
      return;
    }

    setInputError(null);
    onSave({ ...next, bankTransferAmountXof: bankAmount, operators: nextOperators });
  };

  return (
    <section
      id="operator-fees-editor"
      className="sendflow-admin-founder-card"
      aria-labelledby="operator-fees-editor-title"
      data-testid="section-operator-fees-editor"
    >
      <div className="sendflow-admin-founder-head">
        <div>
          <p className="sendflow-admin-overline">Tarification publique</p>
          <h3 id="operator-fees-editor-title">Frais des opérateurs</h3>
        </div>
      </div>
      <p className="sendflow-admin-founder-intro">
        Définissez les frais affichés aux intégrateurs. Les montants sont enregistrés en pourcentage ou en francs CFA.
      </p>

      <div className="grid gap-4">
        <article className="overflow-hidden rounded-[18px] border border-[#e3e7ee] bg-white">
          <h4 className="m-0">
            <button
              type="button"
              aria-expanded={collectionOpen}
              aria-controls="admin-collection-fees-panel"
              onClick={() => setCollectionOpen((open) => !open)}
              className="flex min-h-[66px] w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#fbfcfe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1769ff]"
              data-testid="button-toggle-admin-collection-fees"
            >
              <span className="text-[16px] font-bold tracking-[-.02em] text-[#17202d]">Frais à l’encaissement</span>
              <ChevronDown size={20} aria-hidden="true" className={`shrink-0 text-[#687384] transition-transform ${collectionOpen ? 'rotate-180' : ''}`} />
            </button>
          </h4>
          <div id="admin-collection-fees-panel" hidden={!collectionOpen} className="border-t border-[#edf0f4] p-5">
            <div className="sendflow-admin-form-grid">
              {titleField('collection-title-fr', 'Titre de section · Français', 'collectionTitleFr')}
              {titleField('collection-title-en', 'Section title · English', 'collectionTitleEn')}
            </div>
            <div className="mt-5">
              <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[.11em] text-[#738093]">Commission par opérateur</p>
              {operatorRows('collectionPercent', 'Encaissement')}
            </div>
          </div>
        </article>

        <article className="overflow-hidden rounded-[18px] border border-[#e3e7ee] bg-white">
          <h4 className="m-0">
            <button
              type="button"
              aria-expanded={transferOpen}
              aria-controls="admin-transfer-fees-panel"
              onClick={() => setTransferOpen((open) => !open)}
              className="flex min-h-[66px] w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[#fbfcfe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1769ff]"
              data-testid="button-toggle-admin-transfer-fees"
            >
              <span className="text-[16px] font-bold tracking-[-.02em] text-[#17202d]">Frais de transfert</span>
              <ChevronDown size={20} aria-hidden="true" className={`shrink-0 text-[#687384] transition-transform ${transferOpen ? 'rotate-180' : ''}`} />
            </button>
          </h4>
          <div id="admin-transfer-fees-panel" hidden={!transferOpen} className="border-t border-[#edf0f4] p-5">
            <div className="sendflow-admin-form-grid">
              {titleField('transfer-title-fr', 'Titre de section · Français', 'transferTitleFr')}
              {titleField('transfer-title-en', 'Section title · English', 'transferTitleEn')}
            </div>
            <div className="mt-5">
              <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[.11em] text-[#738093]">Commission par opérateur</p>
              {operatorRows('transferPercent', 'Transfert')}
            </div>
            <div className="mt-6 border-t border-[#edf0f4] pt-5">
              <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[.11em] text-[#738093]">Virement bancaire</p>
              <div className="sendflow-admin-form-grid">
                {titleField('bank-transfer-label-fr', 'Libellé · Français', 'bankTransferLabelFr')}
                {titleField('bank-transfer-label-en', 'Label · English', 'bankTransferLabelEn')}
                <label className="sendflow-admin-field" htmlFor="bank-transfer-amount-xof">
                  <span>Montant fixe · XOF</span>
                  <input
                    id="bank-transfer-amount-xof"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={bankTransferAmountInput}
                    onChange={(event) => updateAmount(event.target.value)}
                    data-testid="input-bank-transfer-amount-xof"
                  />
                </label>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div className="sendflow-admin-founder-foot mt-6">
        <span className="sendflow-admin-muted">Les modifications ne sont publiées qu’après enregistrement.</span>
        {inputError && <p className="sendflow-admin-muted w-full text-[#b42318]" role="alert">{inputError}</p>}
        <button
          type="button"
          className="sendflow-admin-button sendflow-admin-button-primary"
          disabled={saving}
          onClick={submit}
          data-testid="button-save-operator-fees"
        >
          {saving ? <LoaderCircle className="sendflow-admin-spin" size={16} /> : <Save size={16} />}
          {saving ? 'Enregistrement…' : 'Enregistrer les frais'}
        </button>
      </div>
    </section>
  );
}
