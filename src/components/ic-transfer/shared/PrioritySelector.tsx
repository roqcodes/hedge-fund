'use client';

import React from 'react';
import type { OrderPriority } from '@/types/warehouse';
import { ORDER_PRIORITIES } from '@/lib/icTransfer/orderPriority';

type Props = {
  value: OrderPriority;
  onChange: (value: OrderPriority) => void;
  disabled?: boolean;
};

const STYLES: Record<OrderPriority, { active: string; idle: string }> = {
  High: {
    active: 'bg-red-600 text-white border-red-600 shadow-sm font-bold',
    idle: 'text-red-600 hover:bg-red-50',
  },
  Normal: {
    active: 'bg-slate-800 text-white border-slate-800 shadow-sm font-bold',
    idle: 'text-slate-600 hover:bg-slate-100',
  },
  Low: {
    active: 'bg-blue-600 text-white border-blue-600 shadow-sm font-bold',
    idle: 'text-blue-600 hover:bg-blue-50',
  },
};

export default function PrioritySelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1 w-full border border-slate-200/50 h-[46px] sm:h-[54px] items-stretch gap-1">
      {ORDER_PRIORITIES.map(priority => {
        const isActive = value === priority;
        const style = STYLES[priority];
        return (
          <button
            key={priority}
            type="button"
            disabled={disabled}
            onClick={() => onChange(priority)}
            className={`flex-1 text-center text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1 border border-transparent ${
              isActive ? style.active : style.idle
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {priority === 'High' && (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            )}
            {priority}
          </button>
        );
      })}
    </div>
  );
}
