import { WORLD_CURRENCY_CODES } from '@/lib/worldCurrencies';

/** ISO 4217 three-letter currency code. */
export type CurrencyCode = string;

export const MAX_BRANCH_CURRENCIES = 3;

export const DEFAULT_RATES: Record<string, number> = {
  AED: 1,
  USD: 0.2723,
  INR: 22.68,
  EUR: 0.238,
  GBP: 0.206,
  SAR: 1.021,
};

let liveRates: Record<string, number> = { ...DEFAULT_RATES };

export function setLiveCurrencyRates(rates: Record<string, number>) {
  liveRates = { AED: 1, ...rates };
}

export function getLiveCurrencyRates(): Record<string, number> {
  return liveRates;
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return /^[A-Z]{3}$/.test(value) && WORLD_CURRENCY_CODES.has(value);
}

export function sanitizeEnabledCurrencies(input: unknown): CurrencyCode[] {
  const raw = Array.isArray(input) ? input.map(String).map(s => s.toUpperCase()) : ['AED'];
  const unique: CurrencyCode[] = [];
  for (const code of raw) {
    if (!isCurrencyCode(code) || unique.includes(code)) continue;
    unique.push(code);
    if (unique.length >= MAX_BRANCH_CURRENCIES) break;
  }
  return unique.length > 0 ? unique : ['AED'];
}

export function convertFromAed(amountAed: number, target: CurrencyCode | string): number {
  if (target === 'AED') return amountAed;
  const rate = liveRates[target] ?? DEFAULT_RATES[target];
  if (rate == null) return amountAed;
  return amountAed * rate;
}

export function formatConvertedAmount(
  amountAed: number,
  currency: CurrencyCode | string,
  options?: { showPlus?: boolean; suffix?: boolean },
): string {
  const converted = convertFromAed(amountAed, currency);
  const absAmount = Math.abs(converted);
  const numStr = absAmount.toLocaleString('en-US', {
    maximumFractionDigits: 4,
    minimumFractionDigits: 0,
  });
  const sign = converted < 0 ? '-' : options?.showPlus && converted > 0 ? '+' : '';
  const suffix = options?.suffix !== false ? ` ${currency}` : '';
  return `${sign}${numStr}${suffix}`;
}

// Re-export for settings UI
export { WORLD_CURRENCIES, getCurrencyName } from '@/lib/worldCurrencies';
