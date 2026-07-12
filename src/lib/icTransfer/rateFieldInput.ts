/** Display a numeric field — empty string instead of zero (unless keepZero). */
export function formatRateFieldDisplay(
  value: number | null | undefined,
  options?: { keepZero?: boolean; maxFractionDigits?: number },
): string {
  if (value == null || !Number.isFinite(value)) return '';
  if (!options?.keepZero && value === 0) return '';
  const max = options?.maxFractionDigits ?? 14;
  // Preserve precision without locale grouping or forced trailing zeros.
  const fixed = value.toFixed(max);
  if (!fixed.includes('.')) return fixed;
  return fixed.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');
}

/** Parse user input — empty string becomes null. Keeps mid-typing decimals parseable. */
export function parseRateFieldInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (/^-?\d+\.$/u.test(trimmed)) {
    const whole = Number(trimmed.slice(0, -1));
    return Number.isFinite(whole) ? whole : null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** True while the user is still typing a decimal (trailing "."). */
export function isIncompleteDecimalInput(value: string): boolean {
  return /^-?\d+\.$/u.test(value.trim());
}

export type NullableFlatRate = {
  saleRate: number | null;
  conversionRate: number | null;
};

export function coerceFlatRate(flat: NullableFlatRate): { saleRate: number; conversionRate: number } | null {
  if (flat.saleRate == null || flat.saleRate <= 0) return null;
  if (flat.conversionRate == null || flat.conversionRate <= 0) return null;
  return { saleRate: flat.saleRate, conversionRate: flat.conversionRate };
}
