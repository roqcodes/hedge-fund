'use client';

import React, { useState, useRef, useEffect } from 'react';
import { formInput } from '@/lib/ui';

export interface ComboOption {
  value: string;
  label: string;
}

interface ComboSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectOption?: (option: ComboOption) => void;
  options: ComboOption[];
  placeholder?: string;
  className?: string;
}

export default function ComboSearchInput({
  value,
  onChange,
  onSelectOption,
  options,
  placeholder = 'Search or type...',
  className = '',
}: ComboSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(value.toLowerCase()),
  );

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`${formInput} w-full !py-2 !pr-10 !text-sm`}
        />
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {filtered.slice(0, 20).map(option => (
            <button
              key={option.value}
              type="button"
              className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                onChange(option.label);
                onSelectOption?.(option);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
