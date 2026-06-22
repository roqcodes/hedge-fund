'use client';

import React from 'react';
import { tableWrap } from '@/lib/ui';
import { icCompactCell, icCompactMetricLabel, icCompactTable, icCompactTh } from './tableStyles';

type Column = string;
type Row = { label: string; values: (string | number)[] };

type Props = {
  columns: Column[];
  rows: Row[];
  footer?: Row;
};

export default function MatrixTable({ columns, rows, footer }: Props) {
  return (
    <div className={`${tableWrap} px-3 py-3 sm:px-4 sm:py-3.5`}>
      <table className={icCompactTable}>
        <thead>
          <tr>
            <th className={`${icCompactTh('left')} w-28`} scope="col" />
            {columns.map(col => (
              <th key={col} className={icCompactTh('center')} scope="col">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label}>
              <td className={icCompactMetricLabel}>{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className={icCompactCell}>
                  {typeof v === 'number' ? v.toLocaleString() : v}
                </td>
              ))}
            </tr>
          ))}
          {footer && (
            <tr className="bg-slate-50/70">
              <td className={`${icCompactMetricLabel} font-bold text-slate-800`}>{footer.label}</td>
              {footer.values.map((v, i) => (
                <td key={i} className={`${icCompactCell} font-bold`}>
                  {typeof v === 'number' ? v.toLocaleString() : v}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
