'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { dbDeletePhysicalBulkSellAction } from '@/app/actions/physicalActions';
import { physicalPaymentLabel } from '@/lib/physical/paymentLabel';
import PhysicalAmountDisplay from './PhysicalAmountDisplay';
import { usePhysicalCurrency } from '@/hooks/usePhysicalCurrency';
import { useApp } from '@/context/AppContext';

interface PhysicalBulkSellDetailModalProps {
  open: boolean;
  slug: string;
  bulkSell: any;
  childSells: any[];
  onClose: () => void;
  onSuccess: () => void;
}

/** Small labelled stat inside a KPI card */
function KpiCard({
  label,
  value,
  sub,
  accent,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: 'emerald' | 'red' | 'indigo' | 'amber';
  highlight?: boolean;
}) {
  const accentBg: Record<string, string> = {
    emerald: 'bg-emerald-50 border-emerald-200/70',
    red: 'bg-red-50 border-red-200/70',
    indigo: 'bg-indigo-50 border-indigo-200/70',
    amber: 'bg-amber-50 border-amber-200/70',
  };
  const base = highlight
    ? `${accent ? accentBg[accent] : 'bg-slate-900 border-slate-700'} rounded-2xl border p-4`
    : 'bg-slate-50 rounded-2xl border border-slate-100 p-4';

  return (
    <div className={base}>
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <div className={`text-xl font-black font-mono tabular-nums ${highlight && !accent ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </div>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{sub}</p>}
    </div>
  );
}

export default function PhysicalBulkSellDetailModal({
  open,
  slug,
  bulkSell,
  childSells,
  onClose,
  onSuccess,
}: PhysicalBulkSellDetailModalProps) {
  const { canWrite } = useWriteAccess();
  const { physicalBuys } = useApp();
  const { toUsdt } = usePhysicalCurrency();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!open || !bulkSell) return null;

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete this entire Bulk Sell?\n\nThis will restore the remaining volume of all ${childSells.length} source buy deals and reverse the customer balance adjustment of ${bulkSell.sellValue.toLocaleString()} USDT!`,
      )
    )
      return;

    setIsDeleting(true);
    const res = await dbDeletePhysicalBulkSellAction(bulkSell.id);
    setIsDeleting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      alert(res.error);
    }
  };

  const paymentLabel = physicalPaymentLabel;
  const computedTotalIdr = bulkSell.tltIdrValue ?? bulkSell.pureGram * bulkSell.idrGram;
  const profitIsPositive = bulkSell.profit >= 0;

  // grossWeight is now stored correctly as true gross weight (not pure grams).
  // Use bulkSell canonical fields; fall back to child-sum for legacy records.
  const totalGrossWeight = (bulkSell.grossWeight > 0 ? bulkSell.grossWeight : null)
    ?? childSells.reduce((s, c) => s + (c.grossWeight ?? 0), 0);
  const totalPureGram = bulkSell.pureGram
    ?? childSells.reduce((s, c) => s + (c.pureGram ?? 0), 0);
  // Weighted-average purity = pure / gross
  const avgPurity = totalGrossWeight > 0 ? totalPureGram / totalGrossWeight : bulkSell.pureConversion;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </div>  
          <div>
            <p className="text-base font-extrabold text-slate-900 leading-tight">Bulk Sell Details</p>
            <p className="font-mono text-[10px] text-slate-400 leading-tight">
              TXN&nbsp;{bulkSell.txnId || bulkSell.id.split('-')[1]?.toUpperCase()}
            </p>
          </div>
        </div>
      }
      maxWidth="max-w-[1000px] w-[95vw]"
    >
      <div className="space-y-5 pb-4">

        {/* ── SECTION 1 · Identity ─────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Customer */}
          <div className="col-span-2 sm:col-span-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Customer</p>
            <p className="text-lg font-black text-slate-900 leading-tight truncate">{bulkSell.customerName || '—'}</p>
          </div>

          {/* Date */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Date</p>
            <p className="text-sm font-bold text-slate-800 leading-tight">
              {new Date(bulkSell.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              {new Date(bulkSell.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Payment mode */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">Payment</p>
            <p className="text-sm font-bold text-slate-800 leading-tight">{paymentLabel(bulkSell.paymentMode)}</p>
          </div>

          {/* Narration – full width */}
          {(bulkSell.narration || bulkSell.particulars) && (
            <div className="col-span-2 sm:col-span-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500 mb-0.5">Notes</p>
              <p className="text-sm font-semibold text-slate-700">{bulkSell.narration || bulkSell.particulars}</p>
            </div>
          )}
        </div>

        {/* ── SECTION 2 · Financial KPIs ──────────────────────────── */}
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-2 px-0.5">Financial Summary</p>

          {/* Row 1 — gross wt · avg purity · pure vol · IDR rate */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">

            {/* Gross Weight — physical metal sold */}
            <KpiCard
              label="Gross Weight"
              value={
                <span>
                  {totalGrossWeight.toFixed(3)}
                  <span className="text-sm font-bold text-slate-400 ml-1">g</span>
                </span>
              }
            />

            {/* Avg Purity — weighted avg across source deals */}
            <KpiCard
              label="Avg Purity"
              value={avgPurity.toFixed(4)}
              sub={`${(avgPurity * 100).toFixed(2)}%`}
            />

            {/* Pure Volume — the canonical total traded (gross × avg purity) */}
            <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 mb-1">Pure Volume</p>
              <p className="text-xl font-black font-mono text-indigo-700">
                {totalPureGram.toFixed(3)}
                <span className="text-sm font-bold text-indigo-300 ml-1">g</span>
              </p>
              <p className="text-[10px] text-indigo-300 font-mono mt-0.5">
                {totalGrossWeight.toFixed(3)}g × {avgPurity.toFixed(4)}
              </p>
            </div>

            {/* IDR Rate + USDT rate */}
            <KpiCard
              label="IDR Rate / g"
              value={bulkSell.idrGram.toLocaleString()}
              sub={`USDT rate: ${bulkSell.idrToUsdt.toLocaleString()}`}
            />
          </div>

          {/* Row 2 — money totals */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KpiCard
              label="Total IDR"
              value={computedTotalIdr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            />
            <div className="rounded-2xl border border-indigo-200/70 bg-indigo-50 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 mb-1">Sell Value (USDT)</p>
              <div className="text-2xl font-black text-indigo-700">
                <PhysicalAmountDisplay aedAmount={bulkSell.sellValue} size="lg" showUnit={false} align="left" />
              </div>
            </div>
            <div className={`rounded-2xl border p-4 ${profitIsPositive ? 'bg-emerald-50 border-emerald-200/70' : 'bg-red-50 border-red-200/70'}`}>
              <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${profitIsPositive ? 'text-emerald-500' : 'text-red-400'}`}>
                Profit (USDT)
              </p>
              <div className="text-2xl font-black">
                <PhysicalAmountDisplay aedAmount={bulkSell.profit} size="lg" showPlus profitTone="auto" showUnit={false} align="left" />
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION 3 · Source Deals Table ──────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2 px-0.5">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
              Source Buy Deals
            </p>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-500 tabular-nums">
              {childSells.length} deal{childSells.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-xs border-collapse">
              <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400 whitespace-nowrap">Buy Date</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Item</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Purity</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400 whitespace-nowrap">Gross Wt</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-widest text-slate-400 whitespace-nowrap">Pure Wt</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-widest text-slate-400 whitespace-nowrap">Cost (USDT)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-widest text-slate-400 whitespace-nowrap">Sale (USDT)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-widest text-slate-400 whitespace-nowrap">Profit (USDT)</th>
                  <th className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {childSells.map((sell, idx) => {
                  const buy = physicalBuys.find(b => b.id === sell.buyId);
                  const rowProfit = sell.profit ?? 0;
                  return (
                    <tr key={sell.id} className={`transition-colors hover:bg-slate-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-3 py-3 text-slate-500 whitespace-nowrap">
                        {buy ? new Date(buy.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td className="px-3 py-3 font-bold text-slate-800 max-w-[140px] truncate">
                        {buy?.item || buy?.particulars || '—'}
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-slate-500">
                        {sell.pureConversion?.toFixed(4) ?? buy?.pureConversion.toFixed(4) ?? '—'}
                      </td>
                      {/* Gross weight */}
                      <td className="px-3 py-3 text-center font-mono font-semibold text-slate-700">
                        {(sell.grossWeight ?? 0).toFixed(3)}<span className="text-slate-400 ml-0.5">g</span>
                      </td>
                      {/* Pure weight */}
                      <td className="px-3 py-3 text-center">
                        <span className="rounded-lg bg-indigo-50 px-2 py-0.5 font-black font-mono text-indigo-600 text-[11px]">
                          {sell.pureGram.toFixed(3)}g
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-600">
                        {toUsdt(sell.costValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-semibold text-slate-700">
                        {toUsdt(sell.sellValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`px-3 py-3 text-right font-mono font-black ${rowProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {rowProfit >= 0 ? '+' : ''}{toUsdt(rowProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className={`px-3 py-3 text-right font-mono font-bold ${(sell.margin ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {sell.margin?.toFixed(2) || '0.00'}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* ── Totals bar ─────────────────────────────────────── */}
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-100">
                  {/* Label */}
                  <td colSpan={3} className="px-3 py-2.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">Totals</span>
                  </td>
                  {/* Total Volume = Gross Weight */}
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 leading-none mb-0.5">Total Vol.</span>
                      <span className="font-black font-mono text-slate-800 text-[13px]">
                        {totalGrossWeight.toFixed(3)}<span className="text-slate-400 text-[10px] ml-0.5">g</span>
                      </span>
                    </div>
                  </td>
                  {/* Pure Wt */}
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-indigo-400 leading-none mb-0.5">Pure Wt</span>
                      <span className="font-black font-mono text-indigo-700 text-[13px]">
                        {totalPureGram.toFixed(3)}<span className="text-indigo-300 text-[10px] ml-0.5">g</span>
                      </span>
                    </div>
                  </td>
                  {/* Cost total */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 leading-none mb-0.5">Cost</span>
                      <span className="font-black font-mono text-slate-700 text-[13px]">
                        {toUsdt(childSells.reduce((s, c) => s + (c.costValue ?? 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                  {/* Sale total */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 leading-none mb-0.5">Sale</span>
                      <span className="font-black font-mono text-slate-700 text-[13px]">
                        {toUsdt(childSells.reduce((s, c) => s + (c.sellValue ?? 0), 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </td>
                  {/* Profit total */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 leading-none mb-0.5">Profit</span>
                      {(() => {
                        const tot = childSells.reduce((s, c) => s + (c.profit ?? 0), 0);
                        return (
                          <span className={`font-black font-mono text-[13px] ${tot >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {tot >= 0 ? '+' : ''}{toUsdt(tot).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  {/* Avg margin */}
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400 leading-none mb-0.5">Avg Margin</span>
                      {(() => {
                        const margins = childSells.map(c => c.margin ?? 0);
                        const avg = margins.length ? margins.reduce((a, b) => a + b, 0) / margins.length : 0;
                        return (
                          <span className={`font-black font-mono text-[13px] ${avg >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {avg.toFixed(2)}%
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* ── FOOTER ACTIONS ──────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            {canWrite && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-100 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                </svg>
                {isDeleting ? 'Deleting…' : 'Delete Transaction'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
          >
            Close
          </button>
        </div>

      </div>
    </Modal>
  );
}
