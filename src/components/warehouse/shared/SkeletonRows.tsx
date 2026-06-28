'use client';

import React from 'react';

interface SkeletonRowsProps {
  cols: number;
  rows?: number;
}

export default function SkeletonRows({ cols, rows = 5 }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="animate-pulse">
          {Array.from({ length: cols }).map((_, j) => (
            <td
              key={j}
              className={`border-y border-black/5 bg-white px-3 py-3.5 sm:px-5 sm:py-4 ${
                j === 0 ? 'border-l first:rounded-l-2xl' : ''
              } ${j === cols - 1 ? 'border-r last:rounded-r-2xl' : ''}`}
            >
              <div
                className={`h-3.5 rounded-full bg-slate-100 ${
                  j === 0 ? 'w-24' : j === cols - 1 ? 'w-16 ml-auto' : 'w-full max-w-[120px]'
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
