'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import { PhysicalBuy, PhysicalSell } from '@/types';
import PhysicalAmountDisplay from './PhysicalAmountDisplay';
import { usePhysicalCurrency } from '@/hooks/usePhysicalCurrency';
import CustomerLink from '@/components/customers/CustomerLink';
import PhysicalSellEditModal from './PhysicalSellEditModal';
import { physicalPaymentLabel } from '@/lib/physical/paymentLabel';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import { useWriteAccess } from '@/context/RbacWriteContext';
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

interface Props {
  open: boolean;
  slug: string;
  sell: PhysicalSell;
  sourceBuy?: PhysicalBuy | null;
  buyDetailPath?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function fmtGram(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export default function PhysicalSellDetailModal({
  open,
  slug,
  sell,
  sourceBuy,
  buyDetailPath,
  onClose,
  onSuccess,
}: Props) {
  const { canWrite, buttonProps: wp } = useWriteAccess();
  const { fmtUsdt, fmtUsdtDirect } = usePhysicalCurrency();
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleEditClose = () => setIsEditOpen(false);
  const handleEditSuccess = () => {
    onSuccess();
    setIsEditOpen(false);
    onClose();
  };

  if (!open) return null;

  const profitPositive = sell.profit > 0;
  const profitNegative = sell.profit < 0;
  const plTone = profitPositive ? 'profit' : profitNegative ? 'loss' : 'neutral';

  const dateStr = new Date(sell.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = new Date(sell.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <>
      <Modal
        open={open && !isEditOpen}
        onClose={onClose}
        title="Physical Sell"
        maxWidth="max-w-[780px] w-[96vw]"
      >
        <DetailSummaryStack className="space-y-4">
          <DetailSummaryCard ariaLabel="Sell deal summary">
            <DetailSummaryHeader
              badges={
                <>
                  <DetailPill tone="sell">Sell</DetailPill>
                  {profitPositive ? <DetailPill tone="profit">In profit</DetailPill> : null}
                  {profitNegative ? <DetailPill tone="loss">Loss</DetailPill> : null}
                </>
              }
              meta={
                <DetailMetaInline
                  txnId={sell.txnId ? `#${sell.txnId}` : sell.id.split('-')[1]?.toUpperCase() ?? sell.id}
                  date={`${dateStr} · ${timeStr}`}
                />
              }
            />

            <DetailSummarySplit>
              <DetailSummaryPanel side="left">
                <div className="flex max-sm:flex-col max-sm:gap-4 sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
                  <DetailMetricHighlight
                    label="Metal sold"
                    value={fmtGram(sell.grossWeight)}
                    unit="g gross"
                    valueClassName="text-amber-700"
                  />
                  <div className="flex gap-5 sm:gap-6">
                    <DetailMiniMetric label="Pure gram" value={fmtGram(sell.pureGram)} valueClassName="text-indigo-700" align="right" />
                    <DetailMiniMetric label="Purity" value={sell.actualPurity?.toFixed(3) ?? sell.pureGram.toFixed(3)} align="right" />
                  </div>
                </div>
                {(sell.narration || sell.particulars) && (
                  <p className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-600">
                    {sell.narration || sell.particulars}
                  </p>
                )}
              </DetailSummaryPanel>

              <DetailSummaryPanel side="right">
                <DetailSummarySectionTitle>Deal economics</DetailSummarySectionTitle>
                <div className="mt-3 grid grid-cols-3 gap-x-4 gap-y-5 sm:gap-x-6">
                  <DetailUsdtMetric
                    label="Sell value"
                    value={
                      <>
                        {sell.totalUsdt != null ? fmtUsdtDirect(sell.totalUsdt) : fmtUsdt(sell.sellValue)}
                        <span className="ml-1 text-[9px] font-semibold uppercase tracking-wide text-slate-400">USDT</span>
                      </>
                    }
                  />
                  {sell.costValue != null ? (
                    <DetailUsdtMetric
                      label="Cost"
                      value={fmtUsdt(sell.costValue)}
                    />
                  ) : (
                    <DetailUsdtMetric label="Cost" value="—" />
                  )}
                  <DetailUsdtMetric
                    label="P&L"
                    tone={plTone}
                    value={fmtUsdt(sell.profit, true)}
                  />
                </div>
                <DetailCustomerChip
                  initials={(sell.customerName ?? '?').slice(0, 2)}
                  name={
                    <CustomerLink slug={slug} customerId={sell.customerId} customerName={sell.customerName || '—'} />
                  }
                  sub={physicalPaymentLabel(sell.paymentMode)}
                />
              </DetailSummaryPanel>
            </DetailSummarySplit>
          </DetailSummaryCard>

          <DetailSpecCard ariaLabel="Sell deal specifications">
            <DetailSpecPanel title="Commercial">
              <DetailSpecGrid cols={3}>
                <DetailSpecCell
                  label="Sell value"
                  value={
                    <PhysicalAmountDisplay usdtAmount={sell.totalUsdt} aedAmount={sell.sellValue} size="sm" showUnit={false} className="!items-start !text-left" align="left" />
                  }
                />
                {sell.tltIdrValue != null ? (
                  <DetailSpecCell label="IDR value" value={sell.tltIdrValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} mono />
                ) : null}
                {sell.totalUsdt != null ? (
                  <DetailSpecCell label="Total USDT" value={sell.totalUsdt.toLocaleString(undefined, { maximumFractionDigits: 4 })} mono />
                ) : null}
                {sell.deal != null ? (
                  <DetailSpecCell label="Deal #" value={String(sell.deal)} mono />
                ) : null}
              </DetailSpecGrid>
            </DetailSpecPanel>

            <DetailSpecPanel title="Metal & rates" bordered={false}>
              <DetailSpecGrid cols={4}>
                <DetailSpecCell label="Gross wt" value={`${fmtGram(sell.grossWeight)} g`} mono />
                <DetailSpecCell label="Touch" value={String(sell.pureConversion)} mono />
                <DetailSpecCell label="Loss" value={sell.touchLoss?.toFixed(3) ?? '0'} mono />
                <DetailSpecCell label="Pure gram" value={`${fmtGram(sell.pureGram)} g`} mono />
                <DetailSpecCell label="IDR / g" value={sell.idrGram.toLocaleString()} mono />
                <DetailSpecCell label="IDR / USDT" value={sell.idrToUsdt.toLocaleString()} mono />
                <DetailSpecCell label="USDT / g" value={sell.idrRate.toLocaleString(undefined, { maximumFractionDigits: 4 })} mono />
              </DetailSpecGrid>
            </DetailSpecPanel>
          </DetailSpecCard>

          {(sourceBuy || sell.notes) && (
            <DetailSpecCard ariaLabel="Linked buy and notes">
              {sourceBuy ? (
                <DetailSpecPanel title="Source buy" bordered={!!sell.notes}>
                  <DetailSpecCell
                    label="Item"
                    value={
                      buyDetailPath ? (
                        <Link href={buyDetailPath} className="text-accent hover:underline">
                          {sourceBuy.item || sourceBuy.particulars || '—'}
                        </Link>
                      ) : (
                        sourceBuy.item || sourceBuy.particulars || '—'
                      )
                    }
                  />
                </DetailSpecPanel>
              ) : null}
              {sell.notes ? (
                <DetailSpecPanel title="Notes" bordered={false}>
                  <p className="mt-2 text-sm text-slate-600">{sell.notes}</p>
                </DetailSpecPanel>
              ) : null}
            </DetailSpecCard>
          )}

          <DetailFooter>
            <div />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button type="button" onClick={onClose} className={btnSecondary}>
                Close
              </button>
              <button
                type="button"
                onClick={() => canWrite && setIsEditOpen(true)}
                disabled={!canWrite}
                {...wp()}
                className={`${btnPrimary}${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
                Edit deal
              </button>
            </div>
          </DetailFooter>
        </DetailSummaryStack>
      </Modal>

      {isEditOpen ? (
        <PhysicalSellEditModal
          open={isEditOpen}
          slug={slug}
          sell={sell}
          sourceBuy={sourceBuy}
          onClose={handleEditClose}
          onSuccess={handleEditSuccess}
        />
      ) : null}
    </>
  );
}
