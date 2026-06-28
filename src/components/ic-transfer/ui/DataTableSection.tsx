'use client';

import React from 'react';
import { dataTable, tableWrap } from '@/lib/ui';
import { icThClass, icRowLabelClass } from './tableStyles';
import SectionCard from './SectionCard';
import SearchInput from './SearchInput';

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
}: Props) {
  const showSearch = searchValue !== undefined && onSearchChange !== undefined;

  return (
    <SectionCard>
      <div className="flex flex-col gap-3 px-4 pb-3 sm:flex-row sm:items-center sm:justify-between md:border-b md:border-slate-100 md:px-6 md:py-4">
        <h3 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h3>
        {(showSearch || toolbar) && (
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {showSearch && (
              <SearchInput
                value={searchValue}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
              />
            )}
            {toolbar}
          </div>
        )}
      </div>
      <div className="p-0 pb-3 md:pb-5">
        <div className={tableWrap}>
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
      </div>
    </SectionCard>
  );
}

export { icRowLabelClass };
