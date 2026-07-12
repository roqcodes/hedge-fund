import type { ICRateGroup } from '@/types';

/** Max fractional digits for IC rate inputs / storage display. */
export const RATE_DECIMAL_PLACES = 14;

/** Sale rate on rate groups is always AED per unit. */
export function getCurrencyUnitRate(saleRateAed: number, conversionRate: number = 1): number {
  return saleRateAed * conversionRate;
}

export function deriveConversionRate(saleRateAed: number, convertedRate: number): number | null {
  if (!Number.isFinite(saleRateAed) || saleRateAed <= 0 || !Number.isFinite(convertedRate)) return null;
  return convertedRate / saleRateAed;
}

export function deriveConvertedRate(saleRateAed: number, conversionRate: number): number | null {
  if (!Number.isFinite(saleRateAed) || !Number.isFinite(conversionRate)) return null;
  return getCurrencyUnitRate(saleRateAed, conversionRate);
}

/**
 * Format a derived rate for an input field.
 * Keeps up to `fractionDigits` decimals without forcing trailing zeros or early rounding.
 */
export function formatRateInputValue(
  value: number,
  fractionDigits: number = RATE_DECIMAL_PLACES,
): string {
  if (!Number.isFinite(value)) return '';
  if (value === 0) return '0';

  // Avoid scientific notation; trim binary float noise beyond the allowed precision.
  const fixed = value.toFixed(fractionDigits);
  if (!fixed.includes('.')) return fixed;
  return fixed.replace(/(\.\d*?[1-9])0+$/u, '$1').replace(/\.0+$/u, '');
}

export function parseRateInputValue(value: string): number | null {
  if (value.trim() === '') return null;
  // Allow intermediate typing states like "3." or "0."
  if (/^-?\d+\.$/u.test(value.trim())) {
    const whole = parseFloat(value);
    return Number.isFinite(whole) ? whole : null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function computeICSaleAmounts(
  units: number,
  saleRateAed: number,
  conversionRate: number = 1,
  serviceCharge: number = 0,
) {
  const aedBaseTotal = units * saleRateAed;
  const aedNetTotal = Math.max(0, aedBaseTotal - serviceCharge);
  const currencyTotal = aedBaseTotal * conversionRate;
  const inrTotal = units * 1000;

  return {
    saleRateAed,
    conversionRate,
    currencyUnitRate: getCurrencyUnitRate(saleRateAed, conversionRate),
    aedBaseTotal,
    aedNetTotal,
    currencyTotal,
    inrTotal,
  };
}

export function resolveApplicableRateGroup(
  groups: ICRateGroup[],
  options: { branchId?: string; customerId?: string },
): ICRateGroup | undefined {
  const { branchId, customerId } = options;
  if (customerId) {
    const byCustomer = groups.find(g => g.customerIds?.includes(customerId));
    if (byCustomer) return byCustomer;
  }
  if (branchId) {
    return groups.find(g => g.branchIds?.includes(branchId));
  }
  return undefined;
}

export function formatAmount(value: number, fractionDigits = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

/** Display rates with up to 14 decimals (no forced trailing zeros). */
export function formatRateAmount(
  value: number,
  maxFractionDigits: number = RATE_DECIMAL_PLACES,
): string {
  if (!Number.isFinite(value)) return '';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
    useGrouping: false,
  });
}
