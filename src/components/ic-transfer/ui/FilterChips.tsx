'use client';

import React from 'react';
import { filterChip, filterChipActive, filtersBar } from '@/lib/ui';

type Props = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  trailing?: React.ReactNode;
};

export default function FilterChips({ options, value, onChange, trailing }: Props) {
  return (
    <div className={`${filtersBar} mb-4 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between`}>
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-0.5 sm:overflow-visible">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={value === opt ? filterChipActive : filterChip}
          >
            {opt}
          </button>
        ))}
      </div>
      {trailing && <div className="flex flex-wrap items-center gap-2">{trailing}</div>}
    </div>
  );
}
