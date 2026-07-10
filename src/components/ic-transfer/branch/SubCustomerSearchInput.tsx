'use client';

import React, { useState, useRef, useEffect } from 'react';
import { formInput } from '@/lib/ui';
import type { ComboOption } from '@/components/ui/ComboSearchInput';

interface SubCustomerSearchInputProps {
  value: string;
  selectedId: string;
  onChange: (name: string, id: string) => void;
  options: ComboOption[];
  onAddNew: (name: string) => Promise<{ id: string; name: string } | null>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export default function SubCustomerSearchInput({
  value,
  selectedId,
  onChange,
  options,
  onAddNew,
  placeholder = 'Search or type sub-customer…',
  disabled = false,
  className = '',
}: SubCustomerSearchInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
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

  const trimmed = value.trim();
  const filtered = options.filter(o => o.label.toLowerCase().includes(trimmed.toLowerCase()));
  const exactMatch = options.some(o => o.label.toLowerCase() === trimmed.toLowerCase());
  const showAddOption = trimmed.length > 0 && !exactMatch;

  const handleAdd = async () => {
    if (!trimmed || isAdding) return;
    setIsAdding(true);
    try {
      const created = await onAddNew(trimmed);
      if (created) {
        onChange(created.name, created.id);
        setIsOpen(false);
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={value}
          disabled={disabled}
          onChange={e => {
            onChange(e.target.value, '');
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`${formInput} w-full !py-2 !pr-10 !text-sm ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
        />
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </div>

      {isOpen && !disabled && (filtered.length > 0 || showAddOption) && (
        <div className="absolute z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {filtered.slice(0, 20).map(option => (
            <button
              key={option.value}
              type="button"
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                selectedId === option.value ? 'bg-accent/5 text-accent font-semibold' : 'text-slate-700'
              }`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => {
                onChange(option.label, option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
          {showAddOption && (
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-3 py-2.5 text-left text-sm font-semibold text-accent transition-colors hover:bg-accent/5"
              onMouseDown={e => e.preventDefault()}
              onClick={handleAdd}
              disabled={isAdding}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              {isAdding ? 'Adding…' : `Add "${trimmed}" as sub-customer`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
