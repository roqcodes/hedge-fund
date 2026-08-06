'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { useApp } from '@/context/AppContext';
import RateGroupPricingEditor, {
  arePricingEditorValuesEqual,
  getInitialPricingEditorValue,
  type RatePricingEditorValue,
} from './RateGroupPricingEditor';
import { getCurrencyUnitRate, formatRateAmount } from '@/lib/icTransfer/rateCalculations';
import {
  ensurePricingConversions,
  finalizePerTypePricingConfig,
  getPricingSummaryLabel,
  hasAdvancedPricing,
  normalizePricingConfig,
  resolveEditorSeedFlat,
  seedFlatRateForSave,
  validatePricingEditorForSave,
} from '@/lib/icTransfer/ratePricing';
import type { ICRateGroup, ICRateGroupPricingConfig } from '@/types';

type Props = {
  groups: ICRateGroup[];
  isSaving: boolean;
  convertedRateOnly?: boolean;
  standalone?: boolean;
  onSave: (
    groupIds: string[],
    saleRate: number,
    conversionRate: number,
    pricingConfig: ICRateGroupPricingConfig | null,
    convertedRate?: number | null,
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
  standalone = false,
  onSave,
}: Props) {
  const { showToast } = useApp();
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [groupSearch, setGroupSearch] = useState('');
  const [editorKey, setEditorKey] = useState(0);
  const [editorValue, setEditorValue] = useState<RatePricingEditorValue>(() =>
    getInitialPricingEditorValue(),
  );
  const [loadedGroupId, setLoadedGroupId] = useState<string | null>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const lockedConversion =
    convertedRateOnly && referenceGroup?.conversionRate && referenceGroup.conversionRate > 0
      ? referenceGroup.conversionRate
      : undefined;

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

  const loadedGroup = useMemo(
    () => (loadedGroupId ? groups.find(g => g.id === loadedGroupId) : undefined),
    [loadedGroupId, groups],
  );

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
    setSubmitError(null);
    setEditorValue(prev => (arePricingEditorValuesEqual(prev, value) ? prev : value));
  }, []);

  const loadGroupData = (group: ICRateGroup) => {
    setLoadedGroupId(group.id);
    setEditorValue(getInitialPricingEditorValue(group));
    setEditorKey(k => k + 1);
    setSubmitError(null);
  };

  const resetForm = () => {
    setSelectedGroupIds([]);
    setGroupSearch('');
    setSubmitError(null);
    setLoadedGroupId(null);
    setEditorValue(getInitialPricingEditorValue());
    setEditorKey(k => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (selectedGroupIds.length === 0) {
      const msg = 'Select at least one rate group.';
      setSubmitError(msg);
      showToast(msg, 'error');
      return;
    }
    if (mixedCurrencies) {
      const msg = 'Selected groups must share the same currency.';
      setSubmitError(msg);
      showToast(msg, 'error');
      return;
    }

    const seedFlat = resolveEditorSeedFlat(editorValue.flat, {
      lockedConversionRate: lockedConversion,
      convertedRate: editorValue.convertedRate,
    });

    const validationError = validatePricingEditorForSave(editorValue.flat, editorValue.pricingConfig, {
      lockedConversionRate: lockedConversion,
      convertedRate: editorValue.convertedRate,
    });
    if (validationError) {
      setSubmitError(validationError);
      showToast(validationError, 'error');
      return;
    }

    const conversionForSave =
      lockedConversion ??
      (seedFlat.conversionRate > 0 ? seedFlat.conversionRate : 1);

    const preparedConfig = ensurePricingConversions(
      editorValue.pricingConfig.scope === 'per_type' && editorValue.pricingConfig.byTransactionType
        ? finalizePerTypePricingConfig(editorValue.pricingConfig.byTransactionType, seedFlat)
        : normalizePricingConfig(editorValue.pricingConfig, seedFlat),
      conversionForSave,
    );

    const flat = seedFlatRateForSave(editorValue.flat, preparedConfig, {
      lockedConversionRate: lockedConversion,
      convertedRate: editorValue.convertedRate,
    });
    if (!flat) {
      const msg = 'Enter a valid rate before saving.';
      setSubmitError(msg);
      showToast(msg, 'error');
      return;
    }

    const normalized = normalizePricingConfig(preparedConfig, flat);
    const configToSave = hasAdvancedPricing(normalized)
      ? ensurePricingConversions(normalized, flat.conversionRate)
      : null;

    try {
      const success = await onSave(
        selectedGroupIds,
        flat.saleRate,
        flat.conversionRate,
        configToSave,
        // Only pass exact converted for simple flat — advanced modes use per-type / slab rates.
        hasAdvancedPricing(normalized) ? null : editorValue.convertedRate,
      );
      if (success) resetForm();
      else {
        const msg = 'Could not apply rates. Check the toast for details.';
        setSubmitError(msg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not apply rates.';
      setSubmitError(msg);
      showToast(msg, 'error');
    }
  };

  const selectedCount = selectedGroupIds.length;
  // Keep Apply clickable so validation/selection errors can surface via toast + inline message.
  const canSave = !isSaving && !mixedCurrencies;
  const pricingLabel = getPricingSummaryLabel(editorValue.pricingConfig);
  const isAdvanced = hasAdvancedPricing(editorValue.pricingConfig);

  // Preview: exact converted for flat-all; for advanced modes show mode label only.
  const previewConverted =
    !isAdvanced && editorValue.convertedRate != null && editorValue.convertedRate > 0
      ? editorValue.convertedRate
      : !isAdvanced &&
          editorValue.flat.saleRate != null &&
          editorValue.flat.conversionRate != null
        ? getCurrencyUnitRate(editorValue.flat.saleRate, editorValue.flat.conversionRate)
        : null;

  if (groups.length === 0) {
    return (
      <div className={`px-4 py-8 text-center md:px-6 ${standalone ? '' : 'border-b border-slate-100'}`}>
        <p className="text-sm font-medium text-slate-500">
          Create a rate group first to use bulk update.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={standalone ? '' : 'border-b border-slate-100'}
    >
      <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-4 md:flex-row md:items-end md:justify-between md:px-6 md:py-5">
        <div>
          <h3 className="text-sm font-bold text-slate-900 sm:text-base">Bulk rate update</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Pick groups, set a rate, apply once — use Load previous data to copy an existing setup.
          </p>
        </div>
        {selectedCount > 0 ? (
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-bold text-accent">
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
            {selectedCount} selected
          </span>
        ) : null}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-stretch">
        {/* Step 1 — Groups */}
        <aside className="flex w-full flex-col border-b border-slate-100 lg:w-[220px] lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
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

          <div className="border-b border-slate-100 px-3 py-2">
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
                  const isLoaded = loadedGroupId === group.id;
                  return (
                    <li key={group.id}>
                      <div
                        className={`flex items-center gap-1 rounded-xl transition-colors ${
                          checked
                            ? 'bg-accent/[0.06] ring-1 ring-inset ring-accent/20'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleGroup(group.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 px-2 py-2 text-left"
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
                            <span className="block truncate text-[10px] text-slate-400">
                              {group.country} · {group.currency}
                              {group.saleRate > 0
                                ? ` · ${formatRateAmount(getCurrencyUnitRate(group.saleRate, group.conversionRate ?? 1))}`
                                : ''}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          title={`Load previous data from ${group.name}`}
                          onClick={e => {
                            e.stopPropagation();
                            loadGroupData(group);
                          }}
                          className={`mr-1 shrink-0 rounded-md px-1.5 py-1 text-[10px] font-semibold leading-tight transition-colors ${
                            isLoaded
                              ? 'bg-accent/15 text-accent'
                              : 'text-slate-400 hover:bg-white hover:text-accent'
                          }`}
                        >
                          Load
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {selectedGroups.length > 0 ? (
            <div className="mt-auto border-t border-slate-100 px-3 py-2.5">
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
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-slate-100 px-3 py-3 lg:pl-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Step 2
            </p>
            <p className="text-sm font-bold text-slate-900">Set the rate</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {convertedRateOnly
                ? `Select types on the left, then set ${currency} flat or slab rates on the right.`
                : loadedGroup
                  ? `Editing from "${loadedGroup.name}" — select types and set flat or slab rates.`
                  : 'Select transaction types, then set flat or slab rates on the right.'}
            </p>
          </div>

          <div className="flex-1 space-y-5 px-3 py-4 lg:pl-4 lg:pr-4">
            <RateGroupPricingEditor
              key={editorKey}
              group={loadedGroup}
              currency={currency}
              convertedRateOnly={convertedRateOnly}
              lockedConversionRate={lockedConversion}
              variant="guided"
              showExpandToggle={false}
              idPrefix="bulk-pricing"
              onChange={handleEditorChange}
            />
          </div>

          <div className="mt-auto flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-3 py-3 sm:flex-row sm:items-center sm:justify-between lg:pl-4 lg:pr-4">
            <div className="min-w-0 text-xs text-slate-500">
              {submitError ? (
                <span className="font-medium text-red-600">{submitError}</span>
              ) : selectedCount === 0 ? (
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
                        {formatRateAmount(previewConverted)} {currency}
                      </strong>
                    </>
                  ) : isAdvanced ? (
                    <> · rates by transaction type / volume</>
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
