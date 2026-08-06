/** Max decimal places for unit fields (1 unit = 1000 INR → 0.001 step). */
export const UNIT_MAX_FRACTION_DIGITS = 3;

/** Shed IEEE-754 noise after parse. */
export function snapDecimal(value: number, maxFractionDigits: number): number {
  const factor = 10 ** maxFractionDigits;
  return Math.round(value * factor) / factor;
}

/** Display a numeric field — empty string instead of zero (unless keepZero). */
export function formatRateFieldDisplay(
  value: number | null | undefined,
  options?: { keepZero?: boolean; maxFractionDigits?: number },
): string {
  if (value == null || !Number.isFinite(value)) return '';
  if (!options?.keepZero && value === 0) return '';
  const max = options?.maxFractionDigits ?? 10;
  const snapped = snapDecimal(value, max);
  const formatted = snapped.toLocaleString('en-US', {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: max,
  });
  if (!formatted.includes('.')) return formatted;
  return formatted.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');
}

/** Unit slab bounds — decimals OK (e.g. 1.999 = 1999 INR). */
export function formatUnitFieldDisplay(
  value: number | null | undefined,
  options?: { keepZero?: boolean },
): string {
  return formatRateFieldDisplay(value, {
    keepZero: options?.keepZero,
    maxFractionDigits: UNIT_MAX_FRACTION_DIGITS,
  });
}

/** Parse unit input with 3dp snap. */
export function parseUnitFieldInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (/^-?\d+\.$/u.test(trimmed)) {
    const whole = Number(trimmed.slice(0, -1));
    return Number.isFinite(whole) ? snapDecimal(whole, UNIT_MAX_FRACTION_DIGITS) : null;
  }
  if (!/^-?\d*\.?\d+$/u.test(trimmed)) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed)
    ? snapDecimal(parsed, UNIT_MAX_FRACTION_DIGITS)
    : null;
}

/** Step between tiers from previous To (24→25, 1.999→2). */
export function getUnitTierStep(maxUnits: number): number {
  const formatted = formatUnitFieldDisplay(maxUnits, { keepZero: true });
  if (!formatted.includes('.')) return 1;
  const fraction = formatted.split('.')[1] ?? '';
  const trimmed = fraction.replace(/0+$/u, '');
  if (trimmed.length === 0) return 1;
  return 10 ** -trimmed.length;
}

export function nextUnitTierMin(maxUnits: number): number {
  return snapDecimal(maxUnits + getUnitTierStep(maxUnits), UNIT_MAX_FRACTION_DIGITS);
}

/** Parse user input — empty string becomes null. Keeps mid-typing decimals parseable. */
export function parseRateFieldInput(
  value: string,
  maxFractionDigits = 10,
): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  if (/^-?\d+\.$/u.test(trimmed)) {
    const whole = Number(trimmed.slice(0, -1));
    return Number.isFinite(whole) ? snapDecimal(whole, maxFractionDigits) : null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? snapDecimal(parsed, maxFractionDigits) : null;
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
