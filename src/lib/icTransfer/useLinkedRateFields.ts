'use client';

import { useCallback, useRef, useState } from 'react';
import {
  deriveConversionRate,
  deriveConvertedRate,
  formatRateInputValue,
  parseRateInputValue,
} from './rateCalculations';

type LinkedRateField = 'sale' | 'conversion' | 'converted';

/**
 * Linked AED / conversion / converted rate inputs.
 * The field being typed is never rewritten — only sibling fields are derived.
 *
 * Edit AED        → update converted (conversion fixed)
 * Edit conversion → update converted (AED fixed)  — conversion ↔ converted
 * Edit converted  → update conversion (AED fixed) — conversion ↔ converted
 *
 * AED is the anchor when present. If AED is missing, converted+conversion can
 * derive AED as a fallback.
 */
export function useLinkedRateFields() {
  const [saleRate, setSaleRate] = useState('');
  const [conversionRate, setConversionRate] = useState('');
  const [convertedRate, setConvertedRate] = useState('');
  const lastEditedRef = useRef<LinkedRateField | null>(null);

  const onSaleChange = useCallback((value: string) => {
    lastEditedRef.current = 'sale';
    setSaleRate(value);
    if (value.trim() === '' || /^-?\d+\.$/u.test(value.trim())) return;

    const sale = parseRateInputValue(value);
    if (sale === null || sale <= 0) return;

    const conversion = parseRateInputValue(conversionRate);
    if (conversion === null || conversion <= 0) return;

    const nextConverted = deriveConvertedRate(sale, conversion);
    if (nextConverted !== null) setConvertedRate(formatRateInputValue(nextConverted));
  }, [conversionRate]);

  const onConversionChange = useCallback((value: string) => {
    lastEditedRef.current = 'conversion';
    setConversionRate(value);
    if (value.trim() === '' || /^-?\d+\.$/u.test(value.trim())) return;

    const conversion = parseRateInputValue(value);
    if (conversion === null || conversion <= 0) return;

    const sale = parseRateInputValue(saleRate);
    if (sale !== null && sale > 0) {
      // AED fixed → converted = AED × conversion
      const nextConverted = deriveConvertedRate(sale, conversion);
      if (nextConverted !== null) setConvertedRate(formatRateInputValue(nextConverted));
      return;
    }

    // No AED yet — if converted is set, derive AED.
    const converted = parseRateInputValue(convertedRate);
    if (converted !== null && converted > 0) {
      setSaleRate(formatRateInputValue(converted / conversion));
    }
  }, [saleRate, convertedRate]);

  const onConvertedChange = useCallback((value: string) => {
    lastEditedRef.current = 'converted';
    setConvertedRate(value);
    if (value.trim() === '' || /^-?\d+\.$/u.test(value.trim())) return;

    const converted = parseRateInputValue(value);
    if (converted === null || converted <= 0) return;

    const sale = parseRateInputValue(saleRate);
    if (sale !== null && sale > 0) {
      // AED fixed → conversion = converted ÷ AED
      const nextConversion = deriveConversionRate(sale, converted);
      if (nextConversion !== null) setConversionRate(formatRateInputValue(nextConversion));
      return;
    }

    // No AED yet — if conversion is set, derive AED.
    const conversion = parseRateInputValue(conversionRate);
    if (conversion !== null && conversion > 0) {
      setSaleRate(formatRateInputValue(converted / conversion));
    }
  }, [saleRate, conversionRate]);

  /** Set conversion without deriving/overwriting other fields. */
  const setConversionSilent = useCallback((value: string) => {
    setConversionRate(value);
  }, []);

  /** Set sale without deriving sibling fields. */
  const setSaleSilent = useCallback((value: string) => {
    setSaleRate(value);
  }, []);

  /** Set converted without deriving sibling fields. */
  const setConvertedSilent = useCallback((value: string) => {
    setConvertedRate(value);
  }, []);

  const reset = useCallback(() => {
    setSaleRate('');
    setConversionRate('');
    setConvertedRate('');
    lastEditedRef.current = null;
  }, []);

  const saleRateNum = parseRateInputValue(saleRate);
  const conversionRateNum = parseRateInputValue(conversionRate);
  const convertedRateNum = parseRateInputValue(convertedRate);

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
    convertedRateNum,
    lastEdited: lastEditedRef.current,
    hasValidRates,
    onSaleChange,
    onConversionChange,
    onConvertedChange,
    setConversionSilent,
    setSaleSilent,
    setConvertedSilent,
    reset,
  };
}
