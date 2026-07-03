'use client';

import React, { useMemo, useState } from 'react';
import { btnPrimary, formInput, formLabel } from '@/lib/ui';
import RateGroupMultiSelect from './RateGroupMultiSelect';
import { getCurrencyUnitRate, formatAmount } from '@/lib/icTransfer/rateCalculations';
import type { ICRateGroup } from '@/types';

type Props = {
  groups: ICRateGroup[];
  isSaving: boolean;
  onSave: (groupIds: string[], saleRate: number, conversionRate: number) => Promise<boolean>;
};

const inlineFieldClass = 'min-w-0 shrink-0';

export default function RateGroupBulkUpdateBar({ groups, isSaving, onSave }: Props) {
  const [saleRate, setSaleRate] = useState('');
  const [conversionRate, setConversionRate] = useState('');
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroupIds.length === 0) return;
    const saleRateNum = parseFloat(saleRate);
    const conversionRateNum = parseFloat(conversionRate);
    if (!Number.isFinite(saleRateNum) || !Number.isFinite(conversionRateNum)) return;

    const success = await onSave(selectedGroupIds, saleRateNum, conversionRateNum);
    if (success) {
      setSelectedGroupIds([]);
      setSaleRate('');
      setConversionRate('');
    }
  };

  const canSave =
    selectedGroupIds.length > 0 &&
    saleRate.trim() !== '' &&
    conversionRate.trim() !== '' &&
    Number.isFinite(parseFloat(saleRate)) &&
    Number.isFinite(parseFloat(conversionRate)) &&
    !isSaving;

  const convertedRate = useMemo(() => {
    const saleRateNum = parseFloat(saleRate);
    const conversionRateNum = parseFloat(conversionRate);
    if (!Number.isFinite(saleRateNum) || !Number.isFinite(conversionRateNum)) return 0;
    return getCurrencyUnitRate(saleRateNum, conversionRateNum);
  }, [saleRate, conversionRate]);

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-slate-100 px-4 py-4 md:px-6 md:py-5"
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">Bulk rate update</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Apply sale rate and conversion to selected groups. Last updated time is recorded on save.
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
            className={formInput}
            value={saleRate}
            onChange={e => setSaleRate(e.target.value)}
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
            className={formInput}
            value={conversionRate}
            onChange={e => setConversionRate(e.target.value)}
            placeholder="1.000000"
            required
          />
        </div>

        <div className={`${inlineFieldClass} w-full md:w-[132px]`}>
          <label className={formLabel}>Converted Rate</label>
          <div className={`${formInput} flex items-center bg-slate-50 font-semibold tabular-nums text-slate-900`}>
            {formatAmount(convertedRate, 6)}
          </div>
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
