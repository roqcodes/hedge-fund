'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { dbDeletePhysicalBulkSellAction } from '@/app/actions/physicalActions';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { DeleteButton } from '@/components/ui/DeleteActions';
import { physicalPaymentLabel } from '@/lib/physical/paymentLabel';
import PhysicalAmountDisplay from './PhysicalAmountDisplay';
import { usePhysicalCurrency } from '@/hooks/usePhysicalCurrency';
import { useApp } from '@/context/AppContext';
import CustomerLink from '@/components/customers/CustomerLink';
import {
  DetailHero,
  DetailBadge,
  DetailSection,
  DetailField,
  DetailMetaRow,
  DetailPartyCard,
  DetailFooter,
} from '@/components/ui/DealDetailLayout';

interface PhysicalBulkSellDetailModalProps {
  open: boolean;
  slug: string;
  bulkSell: any;
  childSells: any[];
  onClose: () => void;
  onSuccess: () => void;
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
  const { confirm, alert, setLoading, Dialog } = useConfirmDialog();
  const { physicalBuys } = useApp();
  const { toUsdt, fmtUsdt } = usePhysicalCurrency();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!open || !bulkSell) return null;

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete bulk sell?',
      message: `This will restore remaining volume on ${childSells.length} source buy(s), reverse the customer balance (${bulkSell.sellValue.toLocaleString()} USDT), and remove the linked fund ledger entry.`,
      confirmLabel: 'Delete bulk sell',
    });
    if (!ok) return;

    setIsDeleting(true);
    setLoading(true);
    const res = await dbDeletePhysicalBulkSellAction(bulkSell.id);
    setLoading(false);
    setIsDeleting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      await alert({ title: 'Delete failed', message: res.error ?? 'Could not delete bulk sell.' });
    }
  };

  const computedTotalIdr = bulkSell.tltIdrValue ?? bulkSell.pureGram * bulkSell.idrGram;
  const profitPositive = bulkSell.profit > 0;
  const profitNegative = bulkSell.profit < 0;
  const heroAccent = profitPositive ? 'emerald' : profitNegative ? 'red' : 'indigo';

  const totalGrossWeight = (bulkSell.grossWeight > 0 ? bulkSell.grossWeight : null)
    ?? childSells.reduce((s, c) => s + (c.grossWeight ?? 0), 0);
  const totalPureGram = bulkSell.pureGram
    ?? childSells.reduce((s, c) => s + (c.pureGram ?? 0), 0);
  const avgPurity = totalGrossWeight > 0 ? totalPureGram / totalGrossWeight : bulkSell.pureConversion;

  const dateStr = new Date(bulkSell.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = new Date(bulkSell.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const totalCost = childSells.reduce((s, c) => s + (c.costValue ?? 0), 0);
  const totalSale = childSells.reduce((s, c) => s + (c.sellValue ?? 0), 0);
  const totalProfit = childSells.reduce((s, c) => s + (c.profit ?? 0), 0);
  const avgMargin = childSells.length
    ? childSells.reduce((s, c) => s + (c.margin ?? 0), 0) / childSells.length
    : 0;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <div>
              <p className="text-base font-extrabold leading-tight text-slate-900">Bulk Sell</p>
              <p className="font-mono text-[10px] leading-tight text-slate-400">
                {bulkSell.txnId || bulkSell.id.split('-')[1]?.toUpperCase()}
              </p>
            </div>
          </div>
        }
        maxWidth="max-w-[900px] w-[95vw]"
      >
        <div className="space-y-5 pb-4">
          <DetailHero
            eyebrow="Sell value"
            title={<PhysicalAmountDisplay usdtAmount={bulkSell.totalUsdt} aedAmount={bulkSell.sellValue} size="lg" showUnit />}
            subtitle={
              <span className={profitPositive ? 'text-emerald-700' : profitNegative ? 'text-red-700' : 'text-slate-600'}>
                {fmtUsdt(bulkSell.profit, true)} profit · {childSells.length} source deal{childSells.length !== 1 ? 's' : ''}
              </span>
            }
            badge={
              <DetailBadge tone={profitPositive ? 'success' : profitNegative ? 'danger' : 'info'}>
                Bulk sell
              </DetailBadge>
            }
            accent={heroAccent}
          />

          <DetailPartyCard
            label="Customer"
            name={
              bulkSell.customerId ? (
                <CustomerLink slug={slug} customerId={bulkSell.customerId} customerName={bulkSell.customerName || '—'} />
              ) : (
                bulkSell.customerName || '—'
              )
            }
            sub={physicalPaymentLabel(bulkSell.paymentMode)}
          />

          <DetailMetaRow
            items={[
              { label: 'Date', value: dateStr },
              { label: 'Time', value: timeStr },
              { label: 'Txn ID', value: bulkSell.txnId || '—', mono: true },
              { label: 'Source deals', value: String(childSells.length) },
            ]}
          />

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Gross weight</p>
              <p className="mt-1 font-mono text-lg font-black text-slate-900">
                {totalGrossWeight.toFixed(3)}<span className="ml-1 text-sm font-bold text-slate-400">g</span>
              </p>
            </div>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">Pure volume</p>
              <p className="mt-1 font-mono text-lg font-black text-indigo-700">
                {totalPureGram.toFixed(3)}<span className="ml-1 text-sm font-bold text-indigo-400">g</span>
              </p>
              <p className="mt-0.5 text-[10px] font-mono text-indigo-400">avg {avgPurity.toFixed(4)} purity</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total IDR</p>
              <p className="mt-1 font-mono text-lg font-black text-slate-900">
                {computedTotalIdr.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className={`rounded-xl border p-4 ${profitPositive ? 'border-emerald-200 bg-emerald-50/60' : profitNegative ? 'border-red-200 bg-red-50/60' : 'border-slate-100 bg-slate-50/80'}`}>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Profit</p>
              <div className="mt-1">
                <PhysicalAmountDisplay aedAmount={bulkSell.profit} size="md" showPlus profitTone="auto" align="left" showUnit={false} className="!items-start !text-left" />
              </div>
            </div>
          </div>

          <DetailSection title="Rates">
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-white p-4 sm:grid-cols-3">
              <DetailField label="IDR / gram" value={bulkSell.idrGram.toLocaleString()} mono />
              <DetailField label="USDT rate" value={bulkSell.idrToUsdt.toLocaleString()} mono />
              <DetailField label="USDT / gram" value={bulkSell.idrRate.toLocaleString(undefined, { maximumFractionDigits: 4 })} mono />
            </div>
          </DetailSection>

          {(bulkSell.narration || bulkSell.particulars || bulkSell.notes) && (
            <DetailSection title="Notes">
              <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-semibold text-slate-700">
                {bulkSell.narration || bulkSell.particulars || bulkSell.notes}
              </p>
            </DetailSection>
          )}

          <DetailSection title={`Source buy deals (${childSells.length})`}>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Buy date</th>
                    <th className="px-3 py-2.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Item</th>
                    <th className="px-3 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Purity</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Gross wt</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-center text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pure wt</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Cost</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Sale</th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Profit</th>
                    <th className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {childSells.map((sell, idx) => {
                    const buy = physicalBuys.find(b => b.id === sell.buyId);
                    const rowProfit = sell.profit ?? 0;
                    return (
                      <tr key={sell.id} className={`transition-colors hover:bg-slate-50/60 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                        <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                          {buy ? new Date(buy.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                        </td>
                        <td className="max-w-[140px] truncate px-3 py-3 font-bold text-slate-800">
                          {buy?.item || buy?.particulars || '—'}
                        </td>
                        <td className="px-3 py-3 text-center font-mono text-slate-500">
                          {sell.pureConversion?.toFixed(4) ?? buy?.pureConversion.toFixed(4) ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-center font-mono font-semibold text-slate-700">
                          {(sell.grossWeight ?? 0).toFixed(3)}<span className="ml-0.5 text-slate-400">g</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="rounded-lg bg-indigo-50 px-2 py-0.5 font-mono text-[11px] font-black text-indigo-600">
                            {sell.pureGram.toFixed(3)}g
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono text-slate-600">
                          {toUsdt(sell.costValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-3 text-right font-mono font-semibold text-slate-700">
                          {(sell.totalUsdt ?? toUsdt(sell.sellValue)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <tfoot>
                  <tr className="border-t-2 border-slate-200 bg-slate-100">
                    <td colSpan={3} className="px-3 py-2.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Totals</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-[13px] font-black text-slate-800">
                      {totalGrossWeight.toFixed(3)}g
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-[13px] font-black text-indigo-700">
                      {totalPureGram.toFixed(3)}g
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[13px] font-black text-slate-700">
                      {toUsdt(totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[13px] font-black text-slate-700">
                      {toUsdt(totalSale).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono text-[13px] font-black ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {totalProfit >= 0 ? '+' : ''}{toUsdt(totalProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono text-[13px] font-black ${avgMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {avgMargin.toFixed(2)}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </DetailSection>

          <DetailFooter>
            <div>
              {canWrite && (
                <DeleteButton
                  onClick={() => void handleDelete()}
                  label="Delete bulk sell"
                  loading={isDeleting}
                  disabled={isDeleting}
                />
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98]"
            >
              Close
            </button>
          </DetailFooter>
        </div>
      </Modal>
      <Dialog />
    </>
  );
}
