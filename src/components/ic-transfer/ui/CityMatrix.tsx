'use client';

import React from 'react';
import { tableWrap } from '@/lib/ui';
import { icCompactCell, icCompactMetricLabel, icCompactTable, icCompactTh } from './tableStyles';
import { IC_TRANSFER_CITIES } from '@/lib/icTransfer/nav';

export type CityMatrixRow = {
  label: string;
  vol?: number | number[];
  rates?: number[];
  statuses?: readonly string[];
};

type Props = {
  columns?: string[];
  rows: CityMatrixRow[];
};

export default function CityMatrix({ columns, rows }: Props) {
  return (
    <div className={`${tableWrap} px-3 py-3 sm:px-4 sm:py-3.5`}>
      <table className={icCompactTable}>
        <thead>
          <tr>
            <th className={`${icCompactTh('left')} w-20`} scope="col">
              Metric
            </th>
            {(columns || IC_TRANSFER_CITIES).map(city => (
              <th key={city} className={icCompactTh('center')} scope="col">
                {city}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((section, sectionIdx) => (
            <React.Fragment key={section.label}>
              <tr>
                <td
                  colSpan={(columns || IC_TRANSFER_CITIES).length + 1}
                  className={`border-b border-slate-200 px-2 py-1.5 text-[11px] font-bold text-slate-900 sm:px-3 ${sectionIdx > 0 ? 'border-t border-slate-100 bg-slate-50/60' : 'bg-slate-50/40'}`}
                >
                  {section.label}
                </td>
              </tr>
              {section.vol !== undefined && (
                <tr>
                  <td className={icCompactMetricLabel}>Volume</td>
                  {(columns || IC_TRANSFER_CITIES).map((city, i) => (
                    <td key={city} className={icCompactCell}>
                      {Array.isArray(section.vol) ? section.vol[i] : section.vol}
                    </td>
                  ))}
                </tr>
              )}
              {section.rates && (
                <tr>
                  <td className={icCompactMetricLabel}>Rate</td>
                  {section.rates.map((rate, i) => (
                    <td key={i} className={icCompactCell}>
                      {rate.toLocaleString()}
                    </td>
                  ))}
                </tr>
              )}
              {section.statuses && (
                <tr>
                  <td className={icCompactMetricLabel}>Status</td>
                  {section.statuses.map((status, i) => (
                    <td key={i} className={`${icCompactCell} font-sans text-[11px] font-medium`}>
                      {status}
                    </td>
                  ))}
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
