'use client';

import React from 'react';
import { formatInrAmountInWords } from '@/lib/icTransfer/amountInWords';

type Props = {
  amount: number;
  className?: string;
};

export default function InrAmountInWords({ amount, className }: Props) {
  return (
    <span className={className ?? 'mt-1 text-[11px] font-medium leading-snug text-slate-500'}>
      {formatInrAmountInWords(amount)}
    </span>
  );
}
