'use client';

import React from 'react';
import { formInput } from '@/lib/ui';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export default function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}: Props) {
  return (
    <div className={`relative min-w-[200px] flex-1 ${className}`}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${formInput} !py-2 !pl-10 !pr-4 !text-sm`}
      />
    </div>
  );
}
