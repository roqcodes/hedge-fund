'use client';

import React from 'react';
import type { PhysicalBuy } from '@/types';
import type { PhysicalDraftBuy, PhysicalDraftSell } from '@/lib/physical/drafts';
import PhysicalAmountDisplay from './PhysicalAmountDisplay';

export function DraftBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-600 ${className}`}
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
      Draft
    </span>
  );
}

function DiscardButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={e => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center justify-center rounded-lg bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700"
      title={label}
      aria-label={label}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}

const draftCellBase =
  'border-y border-black/5 bg-indigo-50/40 px-3 py-3.5 sm:px-5 sm:py-4';

// ─── Buy ─────────────────────────────────────────────────────────────────

export function DraftBuyRow({
  buy,
  onDiscard,
}: {
  buy: PhysicalDraftBuy;
  onDiscard: (draftId: string) => void;
}) {
  return (
    <tr className="border-l-2 border-l-indigo-300 transition-colors hover:bg-indigo-50/60">
      <td className={`whitespace-nowrap border-l ${draftCellBase} rounded-l-2xl text-xs font-semibold text-slate-500 sm:text-sm`}>
        {new Date(buy.date).toLocaleDateString()}
      </td>
      <td className={`${draftCellBase} text-xs text-slate-600 sm:text-sm`}>
        <div className="flex items-center gap-2">
          <span className="font-medium">{buy.customerName || '—'}</span>
          <DraftBadge />
        </div>
      </td>
      <td className={`${draftCellBase} text-xs text-slate-500 sm:text-sm`}>
        {buy.item || buy.particulars || '-'}
      </td>
      <td className={`${draftCellBase} text-center text-sm`}>{buy.grossWeight.toFixed(2)}</td>
      <td className={`${draftCellBase} text-center text-sm`}>{buy.pureConversion}</td>
      <td className={`${draftCellBase} text-center text-sm font-bold`}>{buy.pureGram.toFixed(2)}</td>
      <td className={draftCellBase}>
        <PhysicalAmountDisplay aedAmount={buy.buyValue} size="md" showUnit={false} />
      </td>
      <td className={`${draftCellBase} text-center text-xs font-semibold text-slate-400`}>
        Not sellable
      </td>
      <td className={`border-r ${draftCellBase} rounded-r-2xl text-center`}>
        <DiscardButton onClick={() => onDiscard(buy.draftId)} label="Discard draft buy" />
      </td>
    </tr>
  );
}

export function DraftBuyCard({
  buy,
  onDiscard,
}: {
  buy: PhysicalDraftBuy;
  onDiscard: (draftId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200 border-l-2 border-l-indigo-300 bg-indigo-50/40 p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between border-b border-indigo-100/70 pb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{buy.item || buy.particulars || 'BUY'}</span>
            <DraftBadge />
          </div>
          <span className="text-[10px] text-slate-400">{new Date(buy.date).toLocaleDateString()}</span>
        </div>
        <DiscardButton onClick={() => onDiscard(buy.draftId)} label="Discard draft buy" />
      </div>
      <div className="grid grid-cols-2 gap-y-3 gap-x-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross Wt</span>
          <span className="text-sm font-bold text-slate-700">{buy.grossWeight.toFixed(2)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pure Gram</span>
          <span className="text-sm font-bold text-slate-700">{buy.pureGram.toFixed(2)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Buy Value (USDT)</span>
          <PhysicalAmountDisplay aedAmount={buy.buyValue} size="md" align="left" className="!items-start !text-left" showUnit={false} />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
          <span className="text-sm font-semibold text-slate-400">Not sellable</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sell ────────────────────────────────────────────────────────────────

const paymentLabelMap: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank / Transfer',
  USDT: 'USDT',
  MULTI_CURRENCY: 'Multy Currency',
};
const paymentLabel = (mode?: string) => (mode ? paymentLabelMap[mode] ?? mode : '—');

export function DraftSellRow({
  sell,
  sourceBuy,
  onDiscard,
}: {
  sell: PhysicalDraftSell;
  sourceBuy?: PhysicalBuy;
  onDiscard: (draftId: string) => void;
}) {
  return (
    <tr className="border-l-2 border-l-indigo-300 transition-colors hover:bg-indigo-50/60">
      <td className={`whitespace-nowrap border-l ${draftCellBase} rounded-l-2xl text-xs font-semibold text-slate-500`}>
        {new Date(sell.date).toLocaleDateString()}
      </td>
      <td className={`${draftCellBase} font-mono text-xs text-slate-500`}>
        <div className="flex items-center gap-2">
          <span>{sell.txnId || '—'}</span>
          <DraftBadge />
        </div>
      </td>
      <td className={`${draftCellBase} text-sm text-slate-700`}>{sell.customerName || '—'}</td>
      <td className={`${draftCellBase} text-sm text-slate-600`}>
        {sourceBuy?.item || sourceBuy?.particulars || '—'}
      </td>
      <td className={`${draftCellBase} text-sm text-slate-600`}>{sell.narration || sell.particulars || '—'}</td>
      <td className={`${draftCellBase} text-center text-sm`}>{sell.grossWeight?.toFixed(2)}</td>
      <td className={`${draftCellBase} text-center text-sm font-bold`}>{sell.pureGram.toFixed(2)}</td>
      <td className={`${draftCellBase} text-center text-xs`}>{paymentLabel(sell.paymentMode)}</td>
      <td className={draftCellBase}>
        <PhysicalAmountDisplay aedAmount={sell.sellValue} size="md" showUnit={false} />
      </td>
      <td className={draftCellBase}>
        <PhysicalAmountDisplay aedAmount={sell.profit} size="md" showPlus profitTone="auto" showUnit={false} />
      </td>
      <td className={`border-r ${draftCellBase} rounded-r-2xl text-center`}>
        <DiscardButton onClick={() => onDiscard(sell.draftId)} label="Discard draft sell" />
      </td>
    </tr>
  );
}

export function DraftSellCard({
  sell,
  sourceBuy,
  onDiscard,
}: {
  sell: PhysicalDraftSell;
  sourceBuy?: PhysicalBuy;
  onDiscard: (draftId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-indigo-200 border-l-2 border-l-indigo-300 bg-indigo-50/40 p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between border-b border-indigo-100/70 pb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{sell.customerName || 'Sale'}</span>
            <DraftBadge />
          </div>
          <p className="text-[10px] text-slate-400">
            {new Date(sell.date).toLocaleDateString()} · {sell.txnId || sell.draftId.slice(0, 8)}
          </p>
        </div>
        <DiscardButton onClick={() => onDiscard(sell.draftId)} label="Discard draft sell" />
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400">Item</span>
          <p>{sourceBuy?.item || sourceBuy?.particulars || '—'}</p>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400">Sell Value (USDT)</span>
          <PhysicalAmountDisplay aedAmount={sell.sellValue} size="md" align="left" className="!items-start !text-left" showUnit={false} />
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400">Profit (USDT)</span>
          <PhysicalAmountDisplay aedAmount={sell.profit} size="md" showPlus profitTone="auto" align="left" className="!items-start !text-left" showUnit={false} />
        </div>
        <div className="col-span-2">
          <span className="text-[10px] font-bold uppercase text-slate-400">Narration</span>
          <p>{sell.narration || '—'}</p>
        </div>
      </div>
    </div>
  );
}
