'use client';

import React from 'react';
import { dataTable, tableWrap } from '@/lib/ui';
import { icThClass, icRowLabelClass } from './tableStyles';
import SectionCard from './SectionCard';
import SearchInput from './SearchInput';
import {
  portalMobileToolbarClass,
  portalMobileToolbarFiltersClass,
  portalMobileCardListClass,
} from '@/lib/icTransfer/layoutConstants';

type Props = {
  title: string;
  columns: string[];
  data?: any[][];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  toolbar?: React.ReactNode;
  emptyMessage?: string;
  minWidth?: string;
  children?: React.ReactNode;
  onHeaderClick?: (column: string) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  /** Optional mobile card list — hides the desktop table below md when provided */
  mobileView?: React.ReactNode;
};

export default function DataTableSection({
  title,
  columns,
  data,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  toolbar,
  emptyMessage = 'No records yet.',
  minWidth = '900px',
  children,
  onHeaderClick,
  sortField,
  sortOrder,
  mobileView,
}: Props) {
  const showSearch = searchValue !== undefined && onSearchChange !== undefined;
  const tableVisibility = mobileView ? 'hidden md:block' : '';

  return (
    <SectionCard>
      <div className={`${portalMobileToolbarClass} md:border-b md:border-slate-100 md:px-6 md:py-4 md:pb-4`}>
        <h3 className="shrink-0 text-base font-bold text-slate-900 sm:text-lg">{title}</h3>
        {showSearch && (
          <SearchInput
            value={searchValue}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            className="min-w-0 max-sm:w-full flex-1"
          />
        )}
        {toolbar ? (
          <div className={portalMobileToolbarFiltersClass}>{toolbar}</div>
        ) : null}
      </div>
      <div className="p-0 pb-3 md:pb-5">
        <div className={`${tableWrap} ${tableVisibility}`}>
          <table className={dataTable} style={{ minWidth }}>
            <thead>
              <tr>
                {columns.map(col => {
                  const isSorted = sortField && col.toLowerCase().replace(/\s/g, '') === sortField.toLowerCase().replace(/\s/g, '');
                  return (
                    <th 
                      key={col} 
                      className={`${icThClass('left')} ${onHeaderClick ? 'cursor-pointer select-none hover:text-slate-800' : ''}`}
                      onClick={() => onHeaderClick?.(col)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{col}</span>
                        {isSorted && (
                          <span className="text-xs text-slate-400">
                            {sortOrder === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {children || (data && data.length > 0 ? (
                data.map((row, i) => (
                  <tr key={i} data-interactive-row>
                    <td className={`${icRowLabelClass} first:rounded-l-2xl`}>{row[0]}</td>
                    {row.slice(1).map((cell, j) => (
                      <td key={j} className="border-y border-black/5 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 sm:px-4">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-sm text-slate-400 sm:py-16">
                    {emptyMessage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {mobileView ? <div className={portalMobileCardListClass}>{mobileView}</div> : null}
      </div>
    </SectionCard>
  );
}

export { icRowLabelClass };
