'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { useApp } from '@/context/AppContext';
import RateGroupPricingEditor, {
  arePricingEditorValuesEqual,
  getInitialPricingEditorValue,
  type RatePricingEditorValue,
} from './RateGroupPricingEditor';
import { coerceFlatRate } from '@/lib/icTransfer/rateFieldInput';
import { getCurrencyUnitRate, formatAmount } from '@/lib/icTransfer/rateCalculations';
import {
  getPricingSummaryLabel,
  hasAdvancedPricing,
  normalizePricingConfig,
  validatePricingEditorForSave,
} from '@/lib/icTransfer/ratePricing';
import type { ICRateGroup, ICRateGroupPricingConfig } from '@/types';

type Props = {
  groups: ICRateGroup[];
  isSaving: boolean;
  convertedRateOnly?: boolean;
  onSave: (
    groupIds: string[],
    saleRate: number,
    conversionRate: number,
    pricingConfig: ICRateGroupPricingConfig | null,
  ) => Promise<boolean>;
};

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function RateGroupBulkUpdateBar({
  groups,
  isSaving,
  convertedRateOnly = false,
  onSave,
}: Props) {
  const { showToast } = useApp();
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [editorValue, setEditorValue] = useState<RatePricingEditorValue>(() =>
    getInitialPricingEditorValue(),
  );

  const selectedGroups = useMemo(
    () => selectedGroupIds
      .map(id => groups.find(g => g.id === id))
      .filter((g): g is ICRateGroup => !!g),
    [selectedGroupIds, groups],
  );

  const currenciesInSelection = useMemo(() => {
    const set = new Set(selectedGroups.map(g => g.currency.toUpperCase()));
    return [...set];
  }, [selectedGroups]);

  const mixedCurrencies = currenciesInSelection.length > 1;

  const referenceGroup = useMemo(() => {
    if (selectedGroups.length > 0) return selectedGroups[0];
    return groups[0];
  }, [selectedGroups, groups]);

  const currency = referenceGroup?.currency ?? 'Currency';

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    const list = [...groups].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return list;
    return list.filter(
      g =>
        g.name.toLowerCase().includes(q) ||
        g.country.toLowerCase().includes(q) ||
        g.currency.toLowerCase().includes(q),
    );
  }, [groups, groupSearch]);

  const allFilteredSelected =
    filteredGroups.length > 0 && filteredGroups.every(g => selectedGroupIds.includes(g.id));

  const toggleGroup = (id: string) => {
    setSelectedGroupIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredGroups.map(g => g.id));
      setSelectedGroupIds(prev => prev.filter(id => !filteredIds.has(id)));
      return;
    }
    setSelectedGroupIds(prev => {
      const next = new Set(prev);
      filteredGroups.forEach(g => next.add(g.id));
      return [...next];
    });
  };

  const handleEditorChange = useCallback((value: RatePricingEditorValue) => {
    setEditorValue(prev => (arePricingEditorValuesEqual(prev, value) ? prev : value));
  }, []);

  const resetForm = () => {
    setSelectedGroupIds([]);
    setGroupSearch('');
    setEditorValue(getInitialPricingEditorValue());
    setEditorKey(k => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedGroupIds.length === 0) {
      showToast('Select at least one rate group.', 'error');
      return;
    }
    if (mixedCurrencies) {
      showToast('Selected groups must share the same currency.', 'error');
      return;
    }

    const validationError = validatePricingEditorForSave(
      editorValue.flat,
      editorValue.pricingConfig,
    );
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    const coerced = coerceFlatRate(editorValue.flat);
    if (!coerced) {
      showToast('Enter a valid rate and conversion before saving.', 'error');
      return;
    }

    const normalized = normalizePricingConfig(editorValue.pricingConfig, coerced);
    const configToSave = hasAdvancedPricing(normalized) ? normalized : null;

    const success = await onSave(
      selectedGroupIds,
      coerced.saleRate,
      coerced.conversionRate,
      configToSave,
    );
    if (success) resetForm();
  };

  const selectedCount = selectedGroupIds.length;
  const canSave = selectedCount > 0 && !mixedCurrencies && !isSaving;
  const previewConverted =
    editorValue.flat.saleRate != null && editorValue.flat.conversionRate != null
      ? getCurrencyUnitRate(editorValue.flat.saleRate, editorValue.flat.conversionRate)
      : null;
  const pricingLabel = getPricingSummaryLabel(editorValue.pricingConfig);

  if (groups.length === 0) {
    return (
      <div className="border-b border-slate-100 px-4 py-8 text-center md:px-6">
        <p className="text-sm font-medium text-slate-500">
          Create a rate group first to use bulk update.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-b border-slate-100"
    >
      <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-4 md:flex-row md:items-end md:justify-between md:px-6 md:py-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 sm:text-base">Bulk rate update</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Pick groups, set a rate, apply once — optional per-type or volume pricing.
          </p>
        </div>
        {selectedCount > 0 ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            {selectedCount} selected
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Step 1 — Groups */}
        <aside className="flex flex-col border-b border-slate-100 lg:col-span-4 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 md:px-5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Step 1
              </p>
              <p className="text-sm font-bold text-slate-900">Select groups</p>
            </div>
            <button
              type="button"
              onClick={toggleSelectAllFiltered}
              className="text-[11px] font-bold text-accent hover:text-accent/80"
            >
              {allFilteredSelected ? 'Clear list' : 'Select all'}
            </button>
          </div>

          <div className="border-b border-slate-100 px-4 py-2.5 md:px-5">
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <IconSearch />
              </span>
              <input
                type="search"
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
                placeholder="Search groups…"
                className={`${formInput} !py-2.5 pl-9 text-sm`}
                aria-label="Search rate groups"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto overscroll-contain px-2 py-2 lg:max-h-[340px]">
            {filteredGroups.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-slate-400">No groups match</p>
            ) : (
              <ul className="space-y-0.5">
                {filteredGroups.map(group => {
                  const checked = selectedGroupIds.includes(group.id);
                  return (
                    <li key={group.id}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                          checked
                            ? 'bg-accent/[0.06] ring-1 ring-inset ring-accent/20'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                            checked
                              ? 'border-accent bg-accent text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                          aria-hidden
                        >
                          {checked ? <IconCheck /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {group.name}
                          </span>
                          <span className="block truncate text-[11px] text-slate-400">
                            {group.country} · {group.currency}
                            {group.saleRate > 0
                              ? ` · ${formatAmount(getCurrencyUnitRate(group.saleRate, group.conversionRate ?? 1), 2)}`
                              : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selectedGroups.length > 0 ? (
            <div className="mt-auto border-t border-slate-100 px-4 py-3 md:px-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Applying to
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedGroups.map(group => (
                  <span
                    key={group.id}
                    className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700"
                  >
                    <span className="truncate">{group.name}</span>
                    <button
                      type="button"
                      className="shrink-0 text-slate-400 hover:text-slate-700"
                      onClick={() => toggleGroup(group.id)}
                      aria-label={`Remove ${group.name}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              {mixedCurrencies ? (
                <p className="mt-2 text-[11px] font-medium text-amber-700">
                  Mixed currencies selected — pick groups with the same currency.
                </p>
              ) : null}
            </div>
          ) : null}
        </aside>

        {/* Step 2 — Rate */}
        <div className="flex flex-col lg:col-span-8">
          <div className="border-b border-slate-100 px-4 py-3 md:px-6">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Step 2
            </p>
            <p className="text-sm font-bold text-slate-900">Set the rate</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {convertedRateOnly
                ? `Enter the ${currency} rate. Choose a pricing mode if you need per-type or volume slabs.`
                : 'Enter AED + conversion (or converted rate). Choose a pricing mode if needed.'}
            </p>
          </div>

          <div className="flex-1 space-y-5 px-4 py-4 md:px-6 md:py-5">
            <RateGroupPricingEditor
              key={editorKey}
              group={undefined}
              currency={currency}
              convertedRateOnly={convertedRateOnly}
              variant="guided"
              showExpandToggle={false}
              idPrefix="bulk-pricing"
              onChange={handleEditorChange}
            />
          </div>

          <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
            <div className="min-w-0 text-xs text-slate-500">
              {selectedCount === 0 ? (
                <span>Select groups on the left to enable apply.</span>
              ) : mixedCurrencies ? (
                <span className="font-medium text-amber-700">Fix currency mix before applying.</span>
              ) : (
                <span>
                  Will apply{' '}
                  <strong className="text-slate-800">{pricingLabel}</strong>
                  {previewConverted != null ? (
                    <>
                      {' '}
                      ·{' '}
                      <strong className="tabular-nums text-slate-800">
                        {formatAmount(previewConverted, 4)} {currency}
                      </strong>
                    </>
                  ) : null}
                  {' '}to {selectedCount} group{selectedCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={resetForm}
                disabled={isSaving}
              >
                Clear
              </button>
              <button
                type="submit"
                className={`${btnPrimary} min-w-[140px]`}
                disabled={!canSave}
              >
                {isSaving
                  ? 'Applying…'
                  : selectedCount > 0
                    ? `Apply to ${selectedCount}`
                    : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
