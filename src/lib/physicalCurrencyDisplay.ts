import { getLiveCurrencyRates } from '@/lib/currency';

/** USD/USDT per 1 AED — mirrors physicalCalculations. */
export function getUsdToAedRate(rates?: Record<string, number>): number {
  const live = rates ?? getLiveCurrencyRates();
  const usdPerAed = live['USD'];
  return usdPerAed && usdPerAed > 0 ? 1 / usdPerAed : 3.6725;
}

/** Convert backend AED amount to USDT (1 USDT ≈ 1 USD). */
export function convertAedToUsdt(aedAmount: number, rates?: Record<string, number>): number {
  if (!Number.isFinite(aedAmount)) return 0;
  return aedAmount / getUsdToAedRate(rates);
}

export function formatPhysicalUsdt(
  usdtAmount: number,
  options?: { showPlus?: boolean; digits?: number },
): string {
  const digits = options?.digits ?? 3;
  const abs = Math.abs(usdtAmount);
  const numStr = abs.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const sign = usdtAmount < 0 ? '-' : options?.showPlus && usdtAmount > 0 ? '+' : '';
  return `${sign}${numStr}`;
}

export function formatPhysicalAed(
  aedAmount: number,
  options?: { showPlus?: boolean; digits?: number },
): string {
  const digits = options?.digits ?? 3;
  const abs = Math.abs(aedAmount);
  const numStr = abs.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const sign = aedAmount < 0 ? '-' : options?.showPlus && aedAmount > 0 ? '+' : '';
  return `${sign}${numStr}`;
}

export function formatPhysicalIdr(idrAmount: number): string {
  return idrAmount.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
