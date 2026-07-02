'use client';

import { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  convertAedToUsdt,
  formatPhysicalAed,
  formatPhysicalUsdt,
} from '@/lib/physicalCurrencyDisplay';

/** Physical module display: USDT primary, AED secondary (backend stores AED). */
export function usePhysicalCurrency() {
  const { currencyRates } = useApp();

  return useMemo(
    () => ({
      toUsdt: (aedAmount: number) => convertAedToUsdt(aedAmount, currencyRates),
      fmtUsdt: (aedAmount: number, showPlus?: boolean) =>
        formatPhysicalUsdt(convertAedToUsdt(aedAmount, currencyRates), { showPlus }),
      fmtAed: (aedAmount: number, showPlus?: boolean) =>
        formatPhysicalAed(aedAmount, { showPlus }),
      fmtUsdtDirect: (usdtAmount: number, showPlus?: boolean) =>
        formatPhysicalUsdt(usdtAmount, { showPlus }),
    }),
    [currencyRates],
  );
}
