'use client';

import { useCallback, useRef, useState } from 'react';
import {
  deriveConversionRate,
  deriveConvertedRate,
  formatRateInputValue,
  parseRateInputValue,
} from './rateCalculations';

type LinkedRateField = 'sale' | 'conversion' | 'converted';

export function useLinkedRateFields() {
  const [saleRate, setSaleRate] = useState('');
  const [conversionRate, setConversionRate] = useState('');
  const [convertedRate, setConvertedRate] = useState('');
  const lastDerivedFrom = useRef<Exclude<LinkedRateField, 'sale'> | null>(null);

  const syncFromSale = useCallback((sale: number, conversion: string, converted: string) => {
    if (lastDerivedFrom.current === 'converted') {
      const convertedNum = parseRateInputValue(converted);
      if (convertedNum === null) return;
      const nextConversion = deriveConversionRate(sale, convertedNum);
      if (nextConversion !== null) setConversionRate(formatRateInputValue(nextConversion));
      return;
    }

    const conversionNum = parseRateInputValue(conversion);
    if (conversionNum === null) return;
    const nextConverted = deriveConvertedRate(sale, conversionNum);
    if (nextConverted !== null) setConvertedRate(formatRateInputValue(nextConverted));
  }, []);

  const onSaleChange = useCallback((value: string) => {
    setSaleRate(value);
    if (value.trim() === '') {
      return;
    }
    const sale = parseRateInputValue(value);
    if (sale !== null && sale > 0) {
      syncFromSale(sale, conversionRate, convertedRate);
    }
  }, [conversionRate, convertedRate, syncFromSale]);

  const onConversionChange = useCallback((value: string) => {
    lastDerivedFrom.current = 'conversion';
    setConversionRate(value);
    if (value.trim() === '') return;

    const sale = parseRateInputValue(saleRate);
    const conversion = parseRateInputValue(value);
    if (sale === null || sale <= 0 || conversion === null) return;

    const nextConverted = deriveConvertedRate(sale, conversion);
    if (nextConverted !== null) setConvertedRate(formatRateInputValue(nextConverted));
  }, [saleRate]);

  const onConvertedChange = useCallback((value: string) => {
    lastDerivedFrom.current = 'converted';
    setConvertedRate(value);
    if (value.trim() === '') return;

    const sale = parseRateInputValue(saleRate);
    const converted = parseRateInputValue(value);
    if (sale === null || sale <= 0 || converted === null) return;

    const nextConversion = deriveConversionRate(sale, converted);
    if (nextConversion !== null) setConversionRate(formatRateInputValue(nextConversion));
  }, [saleRate]);

  const reset = useCallback(() => {
    setSaleRate('');
    setConversionRate('');
    setConvertedRate('');
    lastDerivedFrom.current = null;
  }, []);

  const saleRateNum = parseRateInputValue(saleRate);
  const conversionRateNum = parseRateInputValue(conversionRate);

  const hasValidRates =
    saleRateNum !== null &&
    saleRateNum > 0 &&
    conversionRateNum !== null &&
    conversionRateNum > 0;

  return {
    saleRate,
    conversionRate,
    convertedRate,
    saleRateNum,
    conversionRateNum,
    hasValidRates,
    onSaleChange,
    onConversionChange,
    onConvertedChange,
    reset,
  };
}
