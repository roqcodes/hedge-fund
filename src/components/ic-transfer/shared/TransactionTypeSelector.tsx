'use client';

import React from 'react';
import {
  IC_SALE_TRANSACTION_TYPE_OPTIONS,
  type ICSaleTransactionType,
} from '@/lib/icTransfer/transactionTypes';

type Props = {
  value: string;
  onChange: (value: ICSaleTransactionType) => void;
  disabled?: boolean;
};

export default function TransactionTypeSelector({ value, onChange, disabled = false }: Props) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1 w-full border border-slate-200/50 h-[46px] sm:h-[54px] items-stretch gap-1">
      {IC_SALE_TRANSACTION_TYPE_OPTIONS.map(opt => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            className={`flex-1 text-center text-[10px] sm:text-xs font-semibold rounded-lg transition-all flex items-center justify-center ${
              isActive
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
