'use client';

import React, { useMemo, useState } from 'react';
import { MAX_BRANCH_CURRENCIES, type CurrencyCode } from '@/lib/currency';
import { WORLD_CURRENCIES, getCurrencyName } from '@/lib/worldCurrencies';
import { formInput } from '@/lib/ui';

interface Props {
  selected: CurrencyCode[];
  onChange: (codes: CurrencyCode[]) => void;
}

export default function CurrencyMultiSelect({ selected, onChange }: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return WORLD_CURRENCIES;
    return WORLD_CURRENCIES.filter(
      c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [query]);

  const toggle = (code: CurrencyCode) => {
    if (selected.includes(code)) {
      if (selected.length === 1) return;
      onChange(selected.filter(c => c !== code));
      return;
    }
    if (selected.length >= MAX_BRANCH_CURRENCIES) return;
    onChange([...selected, code]);
  };

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(code => (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent"
            >
              {code}
              <span className="font-normal text-accent/70">{getCurrencyName(code)}</span>
              <span className="text-accent/50">×</span>
            </button>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search currency code or name..."
        className={`${formInput} w-full !py-2 !text-sm`}
      />

      <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-1">
        {filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-slate-500">No currencies match your search.</p>
        ) : (
          filtered.map(({ code, name }) => {
            const isSelected = selected.includes(code);
            const atMax = selected.length >= MAX_BRANCH_CURRENCIES && !isSelected;
            return (
              <button
                key={code}
                type="button"
                onClick={() => toggle(code)}
                disabled={atMax}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-accent/10 font-semibold text-accent'
                    : 'text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-40'
                }`}
              >
                <span>
                  <span className="font-bold">{code}</span>
                  <span className="ml-2 text-slate-500">{name}</span>
                </span>
                {isSelected && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                )}
              </button>
            );
          })
        )}
      </div>

      <p className="text-[11px] font-medium text-slate-400">
        {selected.length}/{MAX_BRANCH_CURRENCIES} selected · {WORLD_CURRENCIES.length} currencies available
      </p>
    </div>
  );
}
