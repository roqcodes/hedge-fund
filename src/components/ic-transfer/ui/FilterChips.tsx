'use client';

import React from 'react';

type Props = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

export default function FilterChips({ options, value, onChange }: Props) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-1.5 sm:gap-2">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
            value === opt
              ? 'bg-red-600 text-white shadow-md'
              : 'bg-transparent text-slate-500 hover:bg-red-50 hover:text-red-600'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
