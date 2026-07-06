'use client';

import React, { useState } from 'react';
import { btnPrimary, formInput, formLabel } from '@/lib/ui';
import RateGroupMultiSelect from './RateGroupMultiSelect';
import { useLinkedRateFields } from '@/lib/icTransfer/useLinkedRateFields';
import type { ICRateGroup } from '@/types';

type Props = {
  groups: ICRateGroup[];
  isSaving: boolean;
  onSave: (groupIds: string[], saleRate: number, conversionRate: number) => Promise<boolean>;
};

const inlineFieldClass = 'min-w-0 shrink-0';

export default function RateGroupBulkUpdateBar({ groups, isSaving, onSave }: Props) {
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const {
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
  } = useLinkedRateFields();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroupIds.length === 0 || !hasValidRates) return;
    if (saleRateNum === null || conversionRateNum === null) return;

    const success = await onSave(selectedGroupIds, saleRateNum, conversionRateNum);
    if (success) {
      setSelectedGroupIds([]);
      reset();
    }
  };

  const canSave = selectedGroupIds.length > 0 && hasValidRates && !isSaving;
  const hasAedRate = saleRateNum !== null && saleRateNum > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-slate-100 px-4 py-4 md:px-6 md:py-5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">Bulk rate update</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Enter the AED rate first, then set conversion or converted rate — the other field updates automatically.
        </p>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:gap-3">
        <div className={`${inlineFieldClass} w-full md:w-[132px]`}>
          <label className={formLabel} htmlFor="bulk-sale-rate">
            Rate in AED
          </label>
          <input
            id="bulk-sale-rate"
            type="number"
            step="0.000001"
            min="0"
            className={formInput}
            value={saleRate}
            onChange={e => onSaleChange(e.target.value)}
            placeholder="0.000000"
            required
          />
        </div>

        <div className={`${inlineFieldClass} w-full md:w-[132px]`}>
          <label className={formLabel} htmlFor="bulk-conversion-rate">
            Conversion
          </label>
          <input
            id="bulk-conversion-rate"
            type="number"
            step="0.000001"
            min="0"
            className={formInput}
            value={conversionRate}
            onChange={e => onConversionChange(e.target.value)}
            placeholder="1.000000"
            disabled={!hasAedRate}
            required
          />
        </div>

        <div className={`${inlineFieldClass} w-full md:w-[132px]`}>
          <label className={formLabel} htmlFor="bulk-converted-rate">
            Converted Rate
          </label>
          <input
            id="bulk-converted-rate"
            type="number"
            step="0.000001"
            min="0"
            className={`${formInput} tabular-nums`}
            value={convertedRate}
            onChange={e => onConvertedChange(e.target.value)}
            placeholder="0.000000"
            disabled={!hasAedRate}
          />
        </div>

        <RateGroupMultiSelect
          groups={groups}
          selectedIds={selectedGroupIds}
          onChange={setSelectedGroupIds}
          label="Groups"
          compact
          className="min-w-0 flex-1"
        />

        <div className={`${inlineFieldClass} w-full md:w-auto`}>
          <span className={`${formLabel} invisible select-none`} aria-hidden>
            Save
          </span>
          <button
            type="submit"
            className={`${btnPrimary} w-full whitespace-nowrap md:w-auto md:min-w-[88px]`}
            disabled={!canSave}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </form>
  );
}
