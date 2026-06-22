'use client';

import React from 'react';
import { tableWrap } from '@/lib/ui';
import { icCompactCell, icCompactMetricLabel, icCompactTable, icCompactTh } from './tableStyles';

type Column = { key: string; label: string };
type Row = { label: string; values: (string | number)[] };

type Props = {
  columns: Column[];
  rows: Row[];
  footer?: Row;
};

/** Small allocation table for warehouse sidebar */
export default function AllocationTable({ columns, rows, footer }: Props) {
  return (
    <div className={`${tableWrap} px-3 pb-3 lg:px-2 lg:pb-2.5`}>
      <table className={icCompactTable}>
        <thead>
          <tr>
            <th className={`${icCompactTh('left')} w-14 !px-1.5`} scope="col" />
            {columns.map(col => (
              <th key={col.key} className={`${icCompactTh('center')} !px-1.5 !text-[9px]`} scope="col">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label}>
              <td className={`${icCompactMetricLabel} !px-1.5 !text-[10px]`}>{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className={`${icCompactCell} !px-1.5`}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
          {footer && (
            <tr className="bg-slate-50/70">
              <td className={`${icCompactMetricLabel} !px-1.5 text-[10px] font-bold text-slate-800`}>
                {footer.label}
              </td>
              {footer.values.map((v, i) => (
                <td key={i} className={`${icCompactCell} !px-1.5 font-bold`}>
                  {v}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
