'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formInput } from '@/lib/ui';
import { PhysicalBuy } from '@/types';

function stockName(b: PhysicalBuy) {
  return b.item || b.particulars || 'Stock';
}

function stockSummary(b: PhysicalBuy) {
  return `${stockName(b)} · ${b.remainingWeight.toFixed(3)}g left`;
}

function stockMeta(b: PhysicalBuy) {
  const parts = [
    b.customerName || 'No customer',
    `${b.remainingWeight.toFixed(3)}g remaining`,
    `Touch ${b.pureConversion}`,
  ];
  if (b.purity != null) parts.push(`Purity ${b.purity}`);
  if (b.marketUsd != null) parts.push(`USD ${b.marketUsd}`);
  return parts.join(' · ');
}

interface StockMetalSelectProps {
  availableBuys: PhysicalBuy[];
  selectedBuyId: string;
  onSelect: (buyId: string) => void;
  placeholder?: string;
}

export default function StockMetalSelect({
  availableBuys,
  selectedBuyId,
  onSelect,
  placeholder = 'Select stock metal...',
}: StockMetalSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedBuy = availableBuys.find(b => b.id === selectedBuyId) ?? null;

  useEffect(() => {
    if (!selectedBuyId) {
      setQuery('');
      return;
    }
    const b = availableBuys.find(x => x.id === selectedBuyId);
    if (b) setQuery(stockSummary(b));
  }, [selectedBuyId, availableBuys]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        if (selectedBuyId) {
          const b = availableBuys.find(x => x.id === selectedBuyId);
          if (b) setQuery(stockSummary(b));
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedBuyId, availableBuys]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableBuys;
    return availableBuys.filter(
      b =>
        stockName(b).toLowerCase().includes(q) ||
        (b.particulars && b.particulars.toLowerCase().includes(q)) ||
        (b.customerName && b.customerName.toLowerCase().includes(q)),
    );
  }, [availableBuys, query]);

  const handleSelect = (b: PhysicalBuy) => {
    onSelect(b.id);
    setQuery(stockSummary(b));
    setIsOpen(false);
  };

  if (availableBuys.length === 0) {
    return <p className="text-sm text-slate-500">No stock with remaining quantity.</p>;
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => {
            const v = e.target.value;
            setQuery(v);
            setIsOpen(true);
            if (selectedBuy && v !== stockSummary(selectedBuy)) {
              onSelect('');
            }
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`${formInput} w-full !py-2 !pr-9 !text-sm`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(o => !o)}
          className="absolute right-0 top-0 flex h-full w-9 items-center justify-center text-slate-400 transition-colors hover:text-slate-600"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-200/50">
          {filtered.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-slate-500">No matching stock</p>
          ) : (
            filtered.map(b => {
              const active = b.id === selectedBuyId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelect(b)}
                  className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-accent/8 ring-1 ring-accent/20' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-slate-800">{stockName(b)}</span>
                    <span className="shrink-0 text-xs font-bold text-amber-600">{b.remainingWeight.toFixed(3)}g</span>
                  </span>
                  <span className="truncate text-[11px] text-slate-500">{stockMeta(b)}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
