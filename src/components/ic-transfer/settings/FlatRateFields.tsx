'use client';

import React, { useEffect, useState } from 'react';
import { formInput, formLabel } from '@/lib/ui';
import {
  formatRateFieldDisplay,
  isIncompleteDecimalInput,
  parseRateFieldInput,
} from '@/lib/icTransfer/rateFieldInput';
import { getCurrencyUnitRate } from '@/lib/icTransfer/rateCalculations';
import type { ICRateTransactionPricing } from '@/types';

type Props = {
  pricing: ICRateTransactionPricing;
  currency: string;
  convertedRateOnly?: boolean;
  lockedConversionRate?: number;
  onChange: (next: ICRateTransactionPricing) => void;
};

export default function FlatRateFields({
  pricing,
  currency,
  convertedRateOnly = false,
  lockedConversionRate,
  onChange,
}: Props) {
  const sale = pricing.saleRate ?? null;
  const conversion =
    lockedConversionRate != null && lockedConversionRate > 0
      ? lockedConversionRate
      : (pricing.conversionRate ?? null);
  const converted =
    sale != null && conversion != null && conversion > 0
      ? getCurrencyUnitRate(sale, conversion)
      : null;

  const [saleText, setSaleText] = useState(() => formatRateFieldDisplay(sale));
  const [conversionText, setConversionText] = useState(() => formatRateFieldDisplay(conversion));
  const [convertedText, setConvertedText] = useState(() => formatRateFieldDisplay(converted));

  useEffect(() => {
    setSaleText(formatRateFieldDisplay(sale));
    setConversionText(formatRateFieldDisplay(conversion));
    setConvertedText(formatRateFieldDisplay(converted));
  }, [sale, conversion, converted]);

  const commitFlat = (nextSale: number | null, nextConversion: number | null) => {
    const conv =
      lockedConversionRate != null && lockedConversionRate > 0
        ? lockedConversionRate
        : nextConversion;
    onChange({
      mode: 'flat',
      saleRate: nextSale ?? undefined,
      conversionRate: conv ?? undefined,
    });
  };

  if (convertedRateOnly) {
    return (
      <div className="max-w-[220px]">
        <label className={formLabel}>Rate ({currency})</label>
        <input
          type="text"
          inputMode="decimal"
          className={`${formInput} tabular-nums`}
          value={convertedText}
          placeholder="—"
          onChange={e => {
            const raw = e.target.value;
            if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
            setConvertedText(raw);
            if (raw.trim() === '' || isIncompleteDecimalInput(raw)) {
              if (raw.trim() === '') commitFlat(null, conversion);
              return;
            }
            const nextConverted = parseRateFieldInput(raw);
            if (nextConverted == null) {
              commitFlat(null, conversion);
              return;
            }
            const conv =
              lockedConversionRate != null && lockedConversionRate > 0
                ? lockedConversionRate
                : conversion != null && conversion > 0
                  ? conversion
                  : 1;
            commitFlat(nextConverted / conv, conv);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <div className="w-full max-w-[140px]">
        <label className={formLabel}>AED rate</label>
        <input
          type="text"
          inputMode="decimal"
          className={`${formInput} tabular-nums`}
          value={saleText}
          placeholder="—"
          onChange={e => {
            const raw = e.target.value;
            if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
            setSaleText(raw);
            if (raw.trim() === '' || isIncompleteDecimalInput(raw)) {
              if (raw.trim() === '') commitFlat(null, conversion);
              return;
            }
            commitFlat(parseRateFieldInput(raw), conversion);
          }}
        />
      </div>
      {lockedConversionRate == null ? (
        <div className="w-full max-w-[140px]">
          <label className={formLabel}>Conversion</label>
          <input
            type="text"
            inputMode="decimal"
            className={`${formInput} tabular-nums`}
            value={conversionText}
            placeholder="—"
            onChange={e => {
              const raw = e.target.value;
              if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
              setConversionText(raw);
              if (raw.trim() === '' || isIncompleteDecimalInput(raw)) {
                if (raw.trim() === '') commitFlat(sale, null);
                return;
              }
              const nextConv = parseRateFieldInput(raw);
              if (nextConv == null || nextConv <= 0) {
                commitFlat(sale, null);
                return;
              }
              commitFlat(sale, nextConv);
            }}
          />
        </div>
      ) : null}
      <div className="w-full max-w-[140px]">
        <label className={formLabel}>Rate ({currency})</label>
        <input
          type="text"
          inputMode="decimal"
          className={`${formInput} tabular-nums`}
          value={convertedText}
          placeholder="—"
          onChange={e => {
            const raw = e.target.value;
            if (raw !== '' && !/^-?\d*\.?\d*$/u.test(raw)) return;
            setConvertedText(raw);
            if (raw.trim() === '' || isIncompleteDecimalInput(raw)) return;
            const nextConverted = parseRateFieldInput(raw);
            if (nextConverted == null || nextConverted <= 0) return;

            if (sale != null && sale > 0) {
              commitFlat(sale, nextConverted / sale);
              return;
            }
            if (conversion != null && conversion > 0) {
              commitFlat(nextConverted / conversion, conversion);
            }
          }}
        />
      </div>
    </div>
  );
}
