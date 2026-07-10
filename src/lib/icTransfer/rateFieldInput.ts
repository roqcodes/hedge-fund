/** Display a numeric field — empty string instead of zero (unless keepZero). */
export function formatRateFieldDisplay(
  value: number | null | undefined,
  options?: { keepZero?: boolean },
): string {
  if (value == null || !Number.isFinite(value)) return '';
  if (!options?.keepZero && value === 0) return '';
  return String(value);
}

/** Parse user input — empty string becomes null. */
export function parseRateFieldInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
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
