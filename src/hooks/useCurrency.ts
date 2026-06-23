'use client';

import { useApp } from '@/context/AppContext';
import { formatAED, formatAEDStr, formatMoneyLabel, formatMoneyValue } from '@/data/mockData';
import type { CurrencyCode } from '@/lib/currency';

/** Subscribe to branch currency + live rates for converted display. */
export function useCurrency() {
  const { activeCurrency, enabledCurrencies, currencyRates, currencyRatesFetchedAt, setActiveCurrency } = useApp();

  return {
    activeCurrency,
    enabledCurrencies,
    currencyRates,
    currencyRatesFetchedAt,
    setActiveCurrency,
    formatMoney: (amountAed: number, showPlus?: boolean) => formatAED(amountAed, showPlus),
    formatMoneyStr: (amountAed: number, showPlus?: boolean) => formatAEDStr(amountAed, showPlus),
    formatMoneyLabel: (amountAed: number, currency?: CurrencyCode, showPlus?: boolean) =>
      formatMoneyLabel(amountAed, currency ?? activeCurrency, showPlus),
    formatMoneyValue: (amountAed: number, currency?: CurrencyCode, showPlus?: boolean) =>
      formatMoneyValue(amountAed, currency ?? activeCurrency, showPlus),
  };
}
