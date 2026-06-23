'use client';

import React from 'react';
import { dataTable, tableWrap } from '@/lib/ui';
import { fmtNum } from '@/lib/physicalCalculations';
import { PAYMENT_MODE_OPTIONS } from '@/lib/physicalCalculations';

type PreviewRow = Record<string, string | number | undefined | null>;

interface PhysicalTxnPreviewProps {
  title?: string;
  rows: PreviewRow[];
  columns: { key: string; label: string; align?: 'left' | 'center' | 'right' }[];
}

export default function PhysicalTxnPreview({ title = 'Transaction Preview', rows, columns }: PhysicalTxnPreviewProps) {
  const paymentLabel = (mode?: string | null) =>
    PAYMENT_MODE_OPTIONS.find(p => p.value === mode)?.label ?? mode ?? '—';

  return (
    <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <div className={`${tableWrap} rounded-xl border border-slate-100`}>
        <table className={`${dataTable} min-w-full text-xs`}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-${col.align ?? 'left'}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {columns.map(col => {
                  let val = row[col.key];
                  if (col.key === 'paymentMode') val = paymentLabel(String(val ?? ''));
                  return (
                    <td
                      key={col.key}
                      className={`border-t border-slate-50 px-3 py-2 text-slate-700 text-${col.align ?? 'left'} ${col.key.includes('Value') || col.key.includes('balance') || col.key.includes('profit') ? 'font-mono font-semibold' : ''}`}
                    >
                      {val === undefined || val === null || val === '' ? '—' : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function buildBuyPreviewRow(form: {
  txnId: string;
  date: string;
  time: string;
  customerName: string;
  openingBalance: string;
  item: string;
  notes: string;
  paymentMode: string;
}, calc: {
  grossWeight: number;
  touch: number;
  purity?: number;
  touchLoss: number;
  actualPurity: number;
  marketUsd: number;
  deal: number;
  idrGram: number;
  usdAmount: number;
  aedAmount: number;
  idrToUsdt: number;
  idrRate: number;
  tltIdrValue: number;
  tltAedValue: number;
  totalUsdt: number;
  buyValue: number;
}) {
  return {
    txnId: form.txnId,
    dateTime: `${form.date} ${form.time}`,
    customer: form.customerName || '—',
    openingBalance: form.openingBalance ? fmtNum(parseFloat(form.openingBalance)) : '—',
    item: form.item || '—',
    notes: form.notes || '—',
    gram: fmtNum(calc.grossWeight, 3),
    touch: calc.touch,
    purity: calc.purity || '—',
    touchLoss: calc.touchLoss || '—',
    actualPurity: fmtNum(calc.actualPurity, 3),
    marketUsd: calc.marketUsd ? fmtNum(calc.marketUsd, 4) : '—',
    deal: calc.deal ? fmtNum(calc.deal) : '—',
    paymentMode: form.paymentMode,
    idr: calc.idrGram ? fmtNum(calc.idrGram, 0) : '—',
    usd: calc.usdAmount ? fmtNum(calc.usdAmount) : '—',
    aed: calc.aedAmount ? fmtNum(calc.aedAmount) : '—',
    totalWeight: fmtNum(calc.actualPurity, 3),
    idrRateUsdt: calc.idrToUsdt ? fmtNum(calc.idrToUsdt, 0) : '—',
    tltIdrValue: fmtNum(calc.tltIdrValue, 0),
    tltAedValue: fmtNum(calc.tltAedValue),
    totalUsdt: fmtNum(calc.totalUsdt, 4),
    buyValue: fmtNum(calc.buyValue),
  };
}

export const BUY_PREVIEW_COLUMNS = [
  { key: 'dateTime', label: 'Date & Time' },
  { key: 'txnId', label: 'TXN ID' },
  { key: 'customer', label: 'Customer' },
  { key: 'openingBalance', label: 'Opening Bal.', align: 'right' as const },
  { key: 'item', label: 'Item' },
  { key: 'gram', label: 'Gram', align: 'right' as const },
  { key: 'touch', label: 'Touch', align: 'right' as const },
  { key: 'actualPurity', label: 'Actual Purity', align: 'right' as const },
  { key: 'paymentMode', label: 'Payment' },
  { key: 'idr', label: 'IDR', align: 'right' as const },
  { key: 'idrRateUsdt', label: 'IDR/USDT', align: 'right' as const },
  { key: 'tltIdrValue', label: 'TLT IDR', align: 'right' as const },
  { key: 'tltAedValue', label: 'TLT AED', align: 'right' as const },
  { key: 'totalUsdt', label: 'Total USDT', align: 'right' as const },
  { key: 'buyValue', label: 'Buy Value', align: 'right' as const },
];

export function buildSellPreviewRow(form: {
  txnId: string;
  date: string;
  time: string;
  customerName: string;
  openingBalance: string;
  narration: string;
  paymentMode: string;
}, calc: {
  grossWeight: number;
  touch: number;
  actualPurity: number;
  idrGram: number;
  idrToUsdt: number;
  tltIdrValue: number;
  tltAedValue: number;
  totalUsdt: number;
  sellValue: number;
  costValue: number;
  margin: number;
  profit: number;
}) {
  return {
    txnId: form.txnId,
    dateTime: `${form.date} ${form.time}`,
    customer: form.customerName || '—',
    openingBalance: form.openingBalance ? fmtNum(parseFloat(form.openingBalance)) : '—',
    narration: form.narration || '—',
    gram: fmtNum(calc.grossWeight, 3),
    touch: calc.touch,
    actualPurity: fmtNum(calc.actualPurity, 3),
    paymentMode: form.paymentMode,
    idr: calc.idrGram ? fmtNum(calc.idrGram, 0) : '—',
    idrRateUsdt: calc.idrToUsdt ? fmtNum(calc.idrToUsdt, 0) : '—',
    tltIdrValue: fmtNum(calc.tltIdrValue, 0),
    tltAedValue: fmtNum(calc.tltAedValue),
    totalUsdt: fmtNum(calc.totalUsdt, 4),
    costValue: fmtNum(calc.costValue),
    margin: `${fmtNum(calc.margin)}%`,
    profit: fmtNum(calc.profit),
    sellValue: fmtNum(calc.sellValue),
  };
}

export const SELL_PREVIEW_COLUMNS = [
  { key: 'dateTime', label: 'Date & Time' },
  { key: 'txnId', label: 'TXN ID' },
  { key: 'customer', label: 'Customer' },
  { key: 'openingBalance', label: 'Opening Bal.', align: 'right' as const },
  { key: 'narration', label: 'Narration' },
  { key: 'gram', label: 'Gram', align: 'right' as const },
  { key: 'touch', label: 'Touch', align: 'right' as const },
  { key: 'actualPurity', label: 'Actual Purity', align: 'right' as const },
  { key: 'paymentMode', label: 'Payment' },
  { key: 'idr', label: 'IDR', align: 'right' as const },
  { key: 'idrRateUsdt', label: 'IDR/USDT', align: 'right' as const },
  { key: 'costValue', label: 'Cost Value', align: 'right' as const },
  { key: 'margin', label: 'Margin', align: 'right' as const },
  { key: 'profit', label: 'Profit', align: 'right' as const },
  { key: 'sellValue', label: 'Sell Value', align: 'right' as const },
];
