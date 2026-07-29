'use client';

import React, { useMemo, useState } from 'react';
import ReportExportButtons from './ReportExportButtons';
import ReportInfoTip from './ReportInfoTip';
import {
  computeCurrencyTotals,
  enrichColumns,
  formatReportAmount,
  matchesReportSearch,
  parseReportAmount,
  shouldShortenColumn,
  shortCode,
  type ReportDef,
  type ReportRow,
} from '@/lib/finance/reportShared';
import { filterSelect, formInput, tabBtn, tabBtnActive, tabsBar } from '@/lib/ui';

type SortDir = 'asc' | 'desc';

function compareRows(a: ReportRow, b: ReportRow, key: string, dir: SortDir): number {
  const av = a[key];
  const bv = b[key];
  const an = parseReportAmount(av);
  const bn = parseReportAmount(bv);
  let cmp = 0;
  if (an != null && bn != null) cmp = an - bn;
  else cmp = String(av ?? '').localeCompare(String(bv ?? ''), undefined, { numeric: true });
  return dir === 'asc' ? cmp : -cmp;
}

function ReportTablePanel({
  def,
  rows,
  branchName,
  globalSearch,
}: {
  def: ReportDef;
  rows: ReportRow[];
  branchName: string;
  globalSearch: string;
}) {
  const built = def.build();
  const columns = useMemo(() => enrichColumns(built.columns), [built.columns]);
  const currencyColumn = def.currencyColumn ?? (columns.some(c => c.key === 'currency') ? 'currency' : undefined);
  const defaultSortKey = columns.some(c => c.key === 'date') ? 'date' : 'slNo';

  const [tableSearch, setTableSearch] = useState('');
  const [sortKey, setSortKey] = useState<string>(defaultSortKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortKey === 'date' ? 'desc' : 'asc');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    for (const col of columns) {
      if (!col.filterable) continue;
      const values = [...new Set(rows.map(r => String(r[col.key] ?? '')).filter(Boolean))].sort();
      if (values.length > 1) opts[col.key] = values;
    }
    return opts;
  }, [columns, rows]);

  const filteredRows = useMemo(() => {
    let result = rows.filter(r => matchesReportSearch(r, globalSearch) && matchesReportSearch(r, tableSearch));
    for (const [key, val] of Object.entries(filterValues)) {
      if (val) result = result.filter(r => String(r[key] ?? '') === val);
    }
    if (sortKey) {
      result = [...result].sort((a, b) => compareRows(a, b, sortKey, sortDir));
    }
    return result.map((r, i) => ({ ...r, slNo: i + 1 })) as ReportRow[];
  }, [rows, globalSearch, tableSearch, filterValues, sortKey, sortDir]);

  const currencyTotals = useMemo(() => {
    if (!currencyColumn) return null;
    return computeCurrencyTotals(filteredRows, columns, currencyColumn);
  }, [filteredRows, columns, currencyColumn]);

  const flatTotals = useMemo(() => {
    if (currencyColumn) return null;
    const totalable = columns.filter(c => c.totalable);
    if (!totalable.length) return null;
    const totals: Record<string, number> = {};
    for (const row of filteredRows) {
      for (const col of totalable) {
        const n = parseReportAmount(row[col.key]);
        if (n == null) continue;
        totals[col.key] = (totals[col.key] ?? 0) + n;
      }
    }
    return Object.keys(totals).length ? totals : null;
  }, [filteredRows, columns, currencyColumn]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'slNo' || key.includes('date') ? 'desc' : 'asc');
    }
  };

  if (!def.available) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
        {def.unavailableReason ?? 'Not available with current data model'}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-surface">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">{def.title}</h3>
            {def.info && <ReportInfoTip text={def.info} label={`About ${def.title}`} />}
          </div>
          <p className="text-sm text-slate-500">{def.subtitle}</p>
        </div>
        <ReportExportButtons
          filename={`${def.id}-${branchName}`}
          pdfTitle={def.title}
          pdfSubtitle={branchName}
          columns={columns}
          rows={filteredRows}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-6">
        <input
          className={`${formInput} !max-w-xs !py-2 !text-xs`}
          placeholder="Filter this table…"
          value={tableSearch}
          onChange={e => setTableSearch(e.target.value)}
        />
        {Object.entries(filterOptions).map(([key, values]) => {
          const col = columns.find(c => c.key === key);
          return (
            <select
              key={key}
              className={`${filterSelect} !text-xs`}
              value={filterValues[key] ?? ''}
              onChange={e => setFilterValues(f => ({ ...f, [key]: e.target.value }))}
            >
              <option value="">All {col?.label ?? key}</option>
              {values.map(v => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          );
        })}
        <span className="ml-auto text-xs text-slate-400">{filteredRows.length} rows</span>
      </div>

      {filteredRows.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-slate-400">No records match filters</div>
      ) : (
        <div className="max-h-[min(520px,60vh)] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs sm:text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_rgb(226_232_240)]">
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={`whitespace-nowrap px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:px-4 ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    } ${col.sortable ? 'cursor-pointer select-none hover:text-slate-800' : ''}`}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  >
                    <span className="inline-flex items-center gap-0.5">
                      {col.label}
                      {col.info && <ReportInfoTip text={col.info} label={col.label} />}
                      {sortKey === col.key && (
                        <span className="text-accent" aria-hidden>
                          {sortDir === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row, i) => (
                <tr key={i} className="border-b border-slate-50 transition-colors hover:bg-slate-50/80">
                  {columns.map(col => {
                    const raw = row[col.key];
                    const display =
                      shouldShortenColumn(col.key) && raw != null && raw !== '—'
                        ? shortCode(raw)
                        : (raw ?? '—');
                    const full = shouldShortenColumn(col.key) ? String(raw ?? '') : undefined;
                    return (
                      <td
                        key={col.key}
                        title={full && full !== display ? full : undefined}
                        className={`whitespace-nowrap px-3 py-2.5 text-slate-700 sm:px-4 ${
                          col.align === 'right' ? 'text-right font-mono tabular-nums' : ''
                        } ${col.key === 'slNo' ? 'text-slate-400' : ''}`}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            {(currencyTotals && currencyTotals.size > 0) || flatTotals ? (
              <tfoot className="sticky bottom-0 bg-slate-100 shadow-[0_-1px_0_0_rgb(226_232_240)]">
                {currencyTotals &&
                  [...currencyTotals.entries()].map(([currency, totals]) => (
                    <tr key={currency} className="border-t border-slate-200 font-semibold text-slate-800">
                      {columns.map((col, ci) => {
                        if (ci === 0) {
                          return (
                            <td key={col.key} className="px-3 py-2.5 sm:px-4">
                              Total ({currency})
                            </td>
                          );
                        }
                        if (col.totalable && totals[col.key] != null) {
                          return (
                            <td key={col.key} className="px-3 py-2.5 text-right font-mono tabular-nums sm:px-4">
                              {formatReportAmount(totals[col.key]!)}
                            </td>
                          );
                        }
                        if (col.key === 'currency') {
                          return (
                            <td key={col.key} className="px-3 py-2.5 sm:px-4">
                              {currency}
                            </td>
                          );
                        }
                        return <td key={col.key} className="px-3 py-2.5 sm:px-4" />;
                      })}
                    </tr>
                  ))}
                {flatTotals && !currencyTotals && (
                  <tr className="border-t border-slate-200 font-semibold text-slate-800">
                    {columns.map((col, ci) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 sm:px-4 ${col.align === 'right' ? 'text-right font-mono tabular-nums' : ''}`}
                      >
                        {ci === 0
                          ? 'Total'
                          : col.totalable && flatTotals[col.key] != null
                            ? formatReportAmount(flatTotals[col.key])
                            : ''}
                      </td>
                    ))}
                  </tr>
                )}
              </tfoot>
            ) : null}
          </table>
        </div>
      )}
    </div>
  );
}

type Props = {
  defs: ReportDef[];
  branchName: string;
  globalSearch: string;
};

export default function ReportTabbedView({ defs, branchName, globalSearch }: Props) {
  const availableDefs = defs.filter(d => d.available);
  const [activeId, setActiveId] = useState(defs[0]?.id ?? '');

  const activeDef = defs.find(d => d.id === activeId) ?? defs[0];
  const activeRows = useMemo(() => {
    if (!activeDef) return [];
    return activeDef.build().rows;
  }, [activeDef]);

  if (!defs.length) return null;

  return (
    <div className="space-y-4">
      <div className={`${tabsBar} mb-0 rounded-2xl border border-slate-100 bg-white px-3 pt-3`} role="tablist">
        {defs.map(def => (
          <button
            key={def.id}
            type="button"
            role="tab"
            aria-selected={activeId === def.id}
            disabled={!def.available}
            className={
              activeId === def.id
                ? tabBtnActive
                : `${tabBtn}${!def.available ? ' cursor-not-allowed opacity-40' : ''}`
            }
            onClick={() => def.available && setActiveId(def.id)}
          >
            {def.title.replace(/ Report$/, '')}
          </button>
        ))}
      </div>

      {activeDef && (
        <ReportTablePanel
          key={activeDef.id}
          def={activeDef}
          rows={activeRows}
          branchName={branchName}
          globalSearch={globalSearch}
        />
      )}

      {!availableDefs.length && (
        <p className="text-center text-sm text-slate-400">No reports available for this module.</p>
      )}
    </div>
  );
}
