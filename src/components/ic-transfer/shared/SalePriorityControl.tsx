'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import type { OrderPriority } from '@/types/warehouse';
import { ORDER_PRIORITIES, normalizePriority } from '@/lib/icTransfer/orderPriority';
import { PriorityBadge } from '@/components/warehouse/shared';

type Props = {
  saleId: string;
  priority?: OrderPriority | null;
  compact?: boolean;
};

export default function SalePriorityControl({ saleId, priority, compact = false }: Props) {
  const { updateICSale, showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const current = normalizePriority(priority);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as OrderPriority;
    if (next === current) return;
    setLoading(true);
    const ok = await updateICSale(saleId, { priority: next });
    setLoading(false);
    if (!ok) {
      showToast('Failed to update priority', 'error');
    }
  };

  if (compact) {
    return (
      <select
        value={current}
        onChange={handleChange}
        disabled={loading}
        onClick={e => e.stopPropagation()}
        className={`rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50 ${
          current === 'High'
            ? 'border-red-300 bg-red-50 text-red-700'
            : current === 'Low'
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
      >
        {ORDER_PRIORITIES.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <PriorityBadge priority={current} />
      <select
        value={current}
        onChange={handleChange}
        disabled={loading}
        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white focus:border-accent focus:outline-none disabled:opacity-50"
      >
        {ORDER_PRIORITIES.map(p => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  );
}
