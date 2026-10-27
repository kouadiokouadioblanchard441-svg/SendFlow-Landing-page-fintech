export const OPERATOR_FEES_CONTENT_KEY = 'pricing.operator-fees';

export type OperatorFeeRate = {
  slug: string;
  collectionPercent: number;
  transferPercent: number;
};

export type OperatorFeesConfig = {
  collectionTitleFr: string;
  collectionTitleEn: string;
  transferTitleFr: string;
  transferTitleEn: string;
  bankTransferLabelFr: string;
  bankTransferLabelEn: string;
  bankTransferAmountXof: number;
  operators: OperatorFeeRate[];
};

function isTitle(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 120;
}

function isPercent(value: unknown): value is number {
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;
}

function isOperatorFeeRate(value: unknown): value is OperatorFeeRate {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.slug === 'string' &&
    /^[a-z0-9][a-z0-9._-]{0,79}$/i.test(row.slug) &&
    isPercent(row.collectionPercent) &&
    isPercent(row.transferPercent);
}

export function parseOperatorFeesConfig(value: unknown): OperatorFeesConfig | null {
  if (typeof value !== 'string') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;
  if (
    !isTitle(candidate.collectionTitleFr) ||
    !isTitle(candidate.collectionTitleEn) ||
    !isTitle(candidate.transferTitleFr) ||
    !isTitle(candidate.transferTitleEn) ||
    !isTitle(candidate.bankTransferLabelFr) ||
    !isTitle(candidate.bankTransferLabelEn) ||
    typeof candidate.bankTransferAmountXof !== 'number' ||
    !Number.isSafeInteger(candidate.bankTransferAmountXof) ||
    candidate.bankTransferAmountXof < 0 ||
    candidate.bankTransferAmountXof > 100_000_000 ||
    !Array.isArray(candidate.operators) ||
    candidate.operators.length > 100 ||
    !candidate.operators.every(isOperatorFeeRate)
  ) {
    return null;
  }

  const operators = candidate.operators as OperatorFeeRate[];
  if (new Set(operators.map((operator) => operator.slug)).size !== operators.length) return null;

  return {
    collectionTitleFr: candidate.collectionTitleFr,
    collectionTitleEn: candidate.collectionTitleEn,
    transferTitleFr: candidate.transferTitleFr,
    transferTitleEn: candidate.transferTitleEn,
    bankTransferLabelFr: candidate.bankTransferLabelFr,
    bankTransferLabelEn: candidate.bankTransferLabelEn,
    bankTransferAmountXof: candidate.bankTransferAmountXof,
    operators,
  };
}
