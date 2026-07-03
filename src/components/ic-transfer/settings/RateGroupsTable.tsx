'use client';

import React from 'react';
import { dataTable, tableWrap } from '@/lib/ui';
import { icThClass } from '../ui/tableStyles';
import {
  formatRateGroupUpdatedAt,
  isRateGroupUpdatedToday,
} from '@/lib/icTransfer/rateGroupUtils';
import { getCurrencyUnitRate, formatAmount } from '@/lib/icTransfer/rateCalculations';
import type { ICRateGroup } from '@/types';

type Props = {
  groups: ICRateGroup[];
  onView: (group: ICRateGroup) => void;
  onEdit: (group: ICRateGroup) => void;
  onDelete: (group: ICRateGroup) => void;
};

const STALE_ROW_CLASS =
  'bg-gradient-to-r from-orange-100/95 via-orange-50/55 to-white';

export default function RateGroupsTable({
  groups,
  onView,
  onEdit,
  onDelete,
}: Props) {
  if (groups.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-slate-400 md:px-6">
        No rate groups yet. Create one to get started.
      </div>
    );
  }

  return (
    <div className={tableWrap}>
      <table className={`${dataTable} min-w-[1120px]`}>
        <thead>
          <tr>
            {[
              'Group',
              'Country',
              'Currency',
              'Sale Rate',
              'Conversion',
              'Converted Rate',
              'Last Updated',
              'Branches',
              'Customers',
              'Actions',
            ].map(col => (
              <th key={col} className={icThClass(col === 'Actions' ? 'center' : 'left')}>
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

            return (
              <tr
                key={group.id}
                data-interactive-row
                className={`group ${stale ? STALE_ROW_CLASS : ''}`}
              >
                <td className={`border-y border-l border-black/5 px-3 py-3.5 first:rounded-l-2xl sm:px-4 sm:py-4 ${cellBg}`}>
                  <div className="flex items-center gap-2">
                    {stale ? (
                      <span
                        className="size-2 shrink-0 rounded-full bg-orange-500"
                        title="Not updated today"
                        aria-hidden
                      />
                    ) : null}
                    <span className="text-sm font-bold text-slate-900">{group.name}</span>
                  </div>
                </td>
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
                <td className={`border-y border-black/5 px-3 py-3.5 text-sm font-bold tabular-nums text-slate-900 sm:px-4 sm:py-4 ${cellBg}`}>
                  <span className="inline-flex items-baseline gap-1">
                    {formatAmount(getCurrencyUnitRate(group.saleRate, group.conversionRate ?? 1), 4)}
                    <span className="text-[11px] font-medium text-slate-400">{group.currency}</span>
                  </span>
                </td>
                <td className={`border-y border-black/5 px-3 py-3.5 text-sm sm:px-4 sm:py-4 ${cellBg} ${stale ? 'font-medium text-orange-800' : 'text-slate-500'}`}>
                  {formatRateGroupUpdatedAt(group.updatedAt)}
                </td>
                <td className={`border-y border-black/5 px-3 py-3.5 text-sm text-slate-600 sm:px-4 sm:py-4 ${cellBg}`}>
                  {branchCount}
                </td>
                <td className={`border-y border-black/5 px-3 py-3.5 text-sm text-slate-600 sm:px-4 sm:py-4 ${cellBg}`}>
                  {customerCount}
                </td>
                <td className={`border-y border-r border-black/5 px-3 py-3.5 text-center last:rounded-r-2xl sm:px-4 sm:py-4 ${cellBg}`}>
                  <div className="flex items-center justify-center gap-1.5">
                    <ActionIconButton label="View group" onClick={() => onView(group)} variant="view" />
                    <ActionIconButton label="Edit group" onClick={() => onEdit(group)} variant="edit" />
                    <ActionIconButton label="Delete group" onClick={() => onDelete(group)} variant="delete" />
                  </div>
                </td>
              </tr>
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
