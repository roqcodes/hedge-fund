'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useWriteAccess } from '@/context/RbacWriteContext';
import { dbDeletePhysicalBulkSellAction } from '@/app/actions/physicalActions';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { DeleteButton } from '@/components/ui/DeleteActions';
import { physicalPaymentLabel } from '@/lib/physical/paymentLabel';
import { usePhysicalCurrency } from '@/hooks/usePhysicalCurrency';
import { useApp } from '@/context/AppContext';
import CustomerLink from '@/components/customers/CustomerLink';
import { btnSecondary } from '@/lib/ui';
import {
  DetailSummaryStack,
  DetailSummaryCard,
  DetailSummaryHeader,
  DetailSummarySplit,
  DetailSummaryPanel,
  DetailSummarySectionTitle,
  DetailPill,
  DetailMetricHighlight,
  DetailMiniMetric,
  DetailUsdtMetric,
  DetailCustomerChip,
  DetailSpecCard,
  DetailSpecPanel,
  DetailSpecGrid,
  DetailSpecCell,
  DetailMetaInline,
  DetailFooter,
} from '@/components/ui/DealDetailLayout';
import {
  fmtBulkIdr,
  fmtBulkPurity,
  fmtBulkRate,
  fmtBulkWeight,
} from '@/lib/physical/bulkSellCalculations';
import { roundTo14 } from '@/lib/physicalCalculations';

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
  const plTone = profitPositive ? 'profit' : profitNegative ? 'loss' : 'neutral';

  const totalGrossWeight = (bulkSell.grossWeight > 0 ? bulkSell.grossWeight : null)
    ?? childSells.reduce((s, c) => s + (c.grossWeight ?? 0), 0);
  const totalPureGram = bulkSell.pureGram
    ?? childSells.reduce((s, c) => s + (c.pureGram ?? 0), 0);
  const avgPurity = totalGrossWeight > 0
    ? roundTo14(totalPureGram / totalGrossWeight)
    : bulkSell.pureConversion;
  const storedIdrRate = bulkSell.idrToUsdt > 0
    ? roundTo14(bulkSell.idrGram / bulkSell.idrToUsdt)
    : bulkSell.idrRate;

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
      <Modal open={open} onClose={onClose} title="Bulk Sell" maxWidth="max-w-[900px] w-[95vw]">
        <DetailSummaryStack className="space-y-4 pb-2">
          <DetailSummaryCard ariaLabel="Bulk sell summary">
            <DetailSummaryHeader
              badges={
                <>
                  <DetailPill tone="bulk">Bulk sell</DetailPill>
                  {profitPositive ? <DetailPill tone="profit">In profit</DetailPill> : null}
                  {profitNegative ? <DetailPill tone="loss">Loss</DetailPill> : null}
                </>
              }
              meta={
                <DetailMetaInline
                  txnId={bulkSell.txnId || bulkSell.id.split('-')[1]?.toUpperCase()}
                  date={`${dateStr} · ${timeStr}`}
                />
              }
            />

            <DetailSummarySplit>
              <DetailSummaryPanel side="left">
                <div className="flex max-sm:flex-col max-sm:gap-4 sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
                  <DetailMetricHighlight
                    label="Pure volume"
                    value={fmtBulkWeight(totalPureGram)}
                    unit="g pure"
                    valueClassName="text-indigo-700"
                  />
                  <div className="flex gap-5 sm:gap-6">
                    <DetailMiniMetric label="Gross wt" value={fmtBulkWeight(totalGrossWeight)} align="right" />
                    <DetailMiniMetric label="Sources" value={String(childSells.length)} valueClassName="text-slate-700" align="right" />
                  </div>
                </div>
                <p className="mt-4 text-[11px] text-slate-400">
                  Wtd avg purity {fmtBulkPurity(avgPurity)} · {childSells.length} source deal{childSells.length !== 1 ? 's' : ''}
                </p>
              </DetailSummaryPanel>

              <DetailSummaryPanel side="right">
                <DetailSummarySectionTitle>Deal economics</DetailSummarySectionTitle>
                <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-5 sm:gap-x-6">
                  <DetailUsdtMetric
                    label="Sell value"
                    value={
                      <>
                        {bulkSell.totalUsdt != null
                          ? bulkSell.totalUsdt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : fmtUsdt(bulkSell.sellValue)}
                        <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">USDT</span>
                      </>
                    }
                  />
                  <DetailUsdtMetric label="Cost" value={fmtUsdt(totalCost)} />
                  <DetailUsdtMetric label="P&L" tone={plTone} value={fmtUsdt(bulkSell.profit, true)} />
                </div>
                <DetailCustomerChip
                  initials={(bulkSell.customerName ?? '?').slice(0, 2)}
                  name={
                    bulkSell.customerId ? (
                      <CustomerLink slug={slug} customerId={bulkSell.customerId} customerName={bulkSell.customerName || '—'} />
                    ) : (
                      bulkSell.customerName || '—'
                    )
                  }
                  sub={physicalPaymentLabel(bulkSell.paymentMode)}
                />
              </DetailSummaryPanel>
            </DetailSummarySplit>
          </DetailSummaryCard>

          <DetailSpecCard ariaLabel="Bulk sell rates">
            <DetailSpecPanel title="Rates & totals">
              <DetailSpecGrid cols={3}>
                <DetailSpecCell label="IDR / g" value={fmtBulkRate(bulkSell.idrGram)} mono />
                <DetailSpecCell label="IDR / USDT" value={fmtBulkRate(bulkSell.idrToUsdt)} mono />
                <DetailSpecCell label="USDT / g" value={fmtBulkRate(storedIdrRate ?? bulkSell.idrRate)} mono />
                <DetailSpecCell label="Total IDR" value={fmtBulkIdr(computedTotalIdr)} mono />
                <DetailSpecCell label="Avg margin" value={`${avgMargin.toFixed(2)}%`} mono />
              </DetailSpecGrid>
            </DetailSpecPanel>

            {(bulkSell.narration || bulkSell.particulars || bulkSell.notes) ? (
              <DetailSpecPanel title="Notes" bordered={false}>
                <p className="mt-2 text-sm text-slate-600">
                  {bulkSell.narration || bulkSell.particulars || bulkSell.notes}
                </p>
              </DetailSpecPanel>
            ) : null}
          </DetailSpecCard>

          <DetailSummaryCard ariaLabel="Source buy deals">
            <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
              <DetailSummarySectionTitle>Source buy deals ({childSells.length})</DetailSummarySectionTitle>
            </div>
            <div className="overflow-x-auto">
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
          </DetailSummaryCard>

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
            <button type="button" onClick={onClose} className={btnSecondary}>
              Close
            </button>
          </DetailFooter>
        </DetailSummaryStack>
      </Modal>
      <Dialog />
    </>
  );
}
