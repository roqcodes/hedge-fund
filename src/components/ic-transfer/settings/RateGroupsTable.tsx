'use client';

import React, { useCallback, useState } from 'react';
import { dataTable, tableWrap, btnPrimary } from '@/lib/ui';
import { useApp } from '@/context/AppContext';
import { icThClass } from '../ui/tableStyles';
import {
  formatRateGroupUpdatedAt,
  isRateGroupUpdatedToday,
} from '@/lib/icTransfer/rateGroupUtils';
import { getCurrencyUnitRate, formatAmount } from '@/lib/icTransfer/rateCalculations';
import {
  ensurePricingConversions,
  getPricingSummaryLabel,
  hasAdvancedPricing,
  normalizePricingConfig,
  seedFlatRateForSave,
  validatePricingEditorForSave,
} from '@/lib/icTransfer/ratePricing';
import type { ICRateGroup, ICRateGroupPricingConfig } from '@/types';
import RateGroupPricingEditor, {
  arePricingEditorValuesEqual,
  getInitialPricingEditorValue,
  type RatePricingEditorValue,
} from './RateGroupPricingEditor';

type Props = {
  groups: ICRateGroup[];
  onView: (group: ICRateGroup) => void;
  onEdit: (group: ICRateGroup) => void;
  onDelete: (group: ICRateGroup) => void;
  onSavePricing?: (
    groupId: string,
    saleRate: number,
    conversionRate: number,
    pricingConfig: ICRateGroupPricingConfig | null,
  ) => Promise<boolean>;
  savingGroupId?: string | null;
  hideBranchColumn?: boolean;
  convertedRateOnly?: boolean;
};

const STALE_ROW_CLASS =
  'bg-gradient-to-r from-orange-100/95 via-orange-50/55 to-white';

export default function RateGroupsTable({
  groups,
  onView,
  onEdit,
  onDelete,
  onSavePricing,
  savingGroupId,
  hideBranchColumn = false,
  convertedRateOnly = false,
}: Props) {
  const { showToast } = useApp();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rowEditorValues, setRowEditorValues] = useState<
    Record<string, RatePricingEditorValue>
  >({});

  const getRowEditorValue = useCallback(
    (group: ICRateGroup): RatePricingEditorValue =>
      rowEditorValues[group.id] ?? getInitialPricingEditorValue(group),
    [rowEditorValues],
  );

  const setRowEditorValue = useCallback((groupId: string, value: RatePricingEditorValue) => {
    setRowEditorValues(prev => {
      const current = prev[groupId];
      if (current && arePricingEditorValuesEqual(current, value)) return prev;
      return { ...prev, [groupId]: value };
    });
  }, []);

  if (groups.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-slate-400 md:px-6">
        {hideBranchColumn
          ? 'No customer rate groups yet. Create one and assign your customers.'
          : 'No rate groups yet. Create one to get started.'}
      </div>
    );
  }

  const columns = [
    '',
    'Group',
    ...(convertedRateOnly ? [] : ['Country', 'Currency', 'Sale Rate', 'Conversion']),
    convertedRateOnly ? 'Rate' : 'Converted Rate',
    'Pricing',
    'Updated',
    ...(hideBranchColumn ? [] : ['Branches']),
    'Customers',
    'Actions',
  ];

  const handleRowSave = async (group: ICRateGroup) => {
    if (!onSavePricing) return;
    const value = getRowEditorValue(group);

    const validationError = validatePricingEditorForSave(value.flat, value.pricingConfig, {
      lockedConversionRate:
        convertedRateOnly && group.conversionRate > 0 ? group.conversionRate : undefined,
    });
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    const seeded = seedFlatRateForSave(value.flat, value.pricingConfig, {
      lockedConversionRate:
        convertedRateOnly && group.conversionRate > 0 ? group.conversionRate : undefined,
      convertedRate: value.convertedRate,
    });
    if (!seeded) {
      showToast('Enter a valid rate before saving.', 'error');
      return;
    }

    const prepared = ensurePricingConversions(
      value.pricingConfig,
      (convertedRateOnly && group.conversionRate > 0
        ? group.conversionRate
        : seeded.conversionRate),
    );
    const normalized = normalizePricingConfig(prepared, seeded);
    const configToSave = hasAdvancedPricing(normalized) ? normalized : null;
    const success = await onSavePricing(
      group.id,
      seeded.saleRate,
      seeded.conversionRate,
      configToSave,
    );
    if (success) {
      setExpandedId(null);
      setRowEditorValues(prev => {
        const next = { ...prev };
        delete next[group.id];
        return next;
      });
    }
  };

  return (
    <div className={tableWrap}>
      <table className={`${dataTable} min-w-[${convertedRateOnly ? '720' : '1120'}px]`}>
        <thead>
          <tr>
            {columns.map(col => (
              <th
                key={col || 'expand'}
                className={icThClass(col === 'Actions' ? 'center' : 'left')}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(group => {
            const branchCount = group.branchIds?.length ?? 0;
            const customerCount = group.customerIds?.length ?? 0;
            const stale = !isRateGroupUpdatedToday(group.updatedAt);
            const cellBg = stale ? 'bg-transparent' : 'bg-white';
            const isExpanded = expandedId === group.id;
            const advanced = hasAdvancedPricing(group.pricingConfig);
            const colSpan = columns.length;
            const converted = getCurrencyUnitRate(group.saleRate, group.conversionRate ?? 1);

            const openView = () => onView(group);

            return (
              <React.Fragment key={group.id}>
                <tr
                  data-interactive-row
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${group.name}`}
                  className={`group cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/40 ${
                    stale ? STALE_ROW_CLASS : 'hover:bg-slate-50/80'
                  }`}
                  onClick={openView}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openView();
                    }
                  }}
                >
                  <td className={`border-y border-l border-black/5 px-2 py-3.5 first:rounded-l-2xl sm:px-3 sm:py-4 ${cellBg}`}>
                    <button
                      type="button"
                      aria-label={isExpanded ? 'Collapse pricing editor' : 'Edit pricing'}
                      aria-expanded={isExpanded}
                      title={isExpanded ? 'Collapse pricing editor' : 'Edit pricing'}
                      className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/80 hover:text-accent"
                      onClick={e => {
                        e.stopPropagation();
                        setExpandedId(isExpanded ? null : group.id);
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        aria-hidden
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </td>
                  <td className={`border-y border-black/5 px-3 py-3.5 sm:px-4 sm:py-4 ${cellBg}`}>
                    <div className="flex min-w-0 items-center gap-2">
                      {stale ? (
                        <span
                          className="size-2 shrink-0 rounded-full bg-orange-500"
                          title="Not updated today"
                          aria-hidden
                        />
                      ) : null}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{group.name}</p>
                        {convertedRateOnly ? (
                          <p className="mt-0.5 truncate text-[11px] text-slate-400">
                            {group.country} · {group.currency}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  {!convertedRateOnly ? (
                    <>
                      <td className={`border-y border-black/5 px-3 py-3.5 text-sm text-slate-600 sm:px-4 sm:py-4 ${cellBg}`}>
                        {group.country}
                      </td>
                      <td className={`border-y border-black/5 px-3 py-3.5 text-sm font-semibold text-slate-800 sm:px-4 sm:py-4 ${cellBg}`}>
                        {group.currency}
                      </td>
                      <td className={`border-y border-black/5 px-3 py-3.5 text-sm font-semibold tabular-nums text-emerald-700 sm:px-4 sm:py-4 ${cellBg}`}>
                        {group.saleRate.toLocaleString()}
                      </td>
                      <td className={`border-y border-black/5 px-3 py-3.5 text-sm font-semibold tabular-nums text-indigo-700 sm:px-4 sm:py-4 ${cellBg}`}>
                        {(group.conversionRate ?? 1).toLocaleString()}
                      </td>
                    </>
                  ) : null}
                  <td className={`border-y border-black/5 px-3 py-3.5 text-sm font-bold tabular-nums text-slate-900 sm:px-4 sm:py-4 ${cellBg}`}>
                    <span className="inline-flex items-baseline gap-1">
                      {formatAmount(converted, 4)}
                      <span className="text-[11px] font-medium text-slate-400">{group.currency}</span>
                    </span>
                    {advanced ? (
                      <span className="mt-0.5 block text-[10px] font-medium text-slate-400">
                        Base · see pricing
                      </span>
                    ) : null}
                  </td>
                  <td className={`border-y border-black/5 px-3 py-3.5 text-xs sm:px-4 sm:py-4 ${cellBg}`}>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${
                        advanced
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {getPricingSummaryLabel(group.pricingConfig)}
                    </span>
                  </td>
                  <td className={`border-y border-black/5 px-3 py-3.5 text-sm sm:px-4 sm:py-4 ${cellBg} ${stale ? 'font-medium text-orange-800' : 'text-slate-500'}`}>
                    {formatRateGroupUpdatedAt(group.updatedAt)}
                  </td>
                  {!hideBranchColumn && (
                    <td className={`border-y border-black/5 px-3 py-3.5 text-sm text-slate-600 sm:px-4 sm:py-4 ${cellBg}`}>
                      {branchCount}
                    </td>
                  )}
                  <td className={`border-y border-black/5 px-3 py-3.5 text-sm text-slate-600 sm:px-4 sm:py-4 ${cellBg}`}>
                    {customerCount}
                  </td>
                  <td className={`border-y border-r border-black/5 px-3 py-3.5 text-center last:rounded-r-2xl sm:px-4 sm:py-4 ${cellBg}`}>
                    <div
                      className="flex items-center justify-center gap-1.5"
                      onClick={e => e.stopPropagation()}
                      onKeyDown={e => e.stopPropagation()}
                    >
                      <ActionIconButton label="View group" onClick={() => onView(group)} variant="view" />
                      <ActionIconButton label="Edit group" onClick={() => onEdit(group)} variant="edit" />
                      <ActionIconButton label="Delete group" onClick={() => onDelete(group)} variant="delete" />
                    </div>
                  </td>
                </tr>

                {isExpanded ? (
                  <tr className={stale ? STALE_ROW_CLASS : 'bg-slate-50/40'}>
                    <td colSpan={colSpan} className="border-b border-black/5 px-4 py-4 sm:px-6">
                      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-surface-xs">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-slate-900">{group.name}</p>
                            <p className="text-xs text-slate-500">
                              Configure flat or volume-based rates per transaction type.
                            </p>
                          </div>
                          {onSavePricing ? (
                            <button
                              type="button"
                              className={`${btnPrimary} shrink-0`}
                              disabled={savingGroupId === group.id}
                              onClick={() => handleRowSave(group)}
                            >
                              {savingGroupId === group.id ? 'Saving…' : 'Save pricing'}
                            </button>
                          ) : null}
                        </div>
                        <RateGroupPricingEditor
                          group={group}
                          currency={group.currency}
                          convertedRateOnly={convertedRateOnly}
                          lockedConversionRate={
                            convertedRateOnly && group.conversionRate > 0
                              ? group.conversionRate
                              : undefined
                          }
                          defaultExpanded={advanced}
                          showExpandToggle
                          idPrefix={`row-${group.id}`}
                          onChange={value => setRowEditorValue(group.id, value)}
                        />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ActionIconButton({
  label,
  onClick,
  variant,
}: {
  label: string;
  onClick: () => void;
  variant: 'view' | 'edit' | 'delete';
}) {
  const styles = {
    view: 'text-slate-500 hover:border-slate-300 hover:bg-white/80 hover:text-slate-800',
    edit: 'text-sky-600 hover:border-sky-200 hover:bg-white/80 hover:text-sky-700',
    delete: 'text-red-500 hover:border-red-200 hover:bg-white/80 hover:text-red-700',
  }[variant];

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white/70 shadow-surface-xs transition-colors ${styles}`}
    >
      {variant === 'view' ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      ) : variant === 'edit' ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
        </svg>
      )}
    </button>
  );
}
