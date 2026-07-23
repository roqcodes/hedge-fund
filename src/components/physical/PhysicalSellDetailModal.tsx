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
  DetailHero,
  DetailBadge,
  DetailSection,
  DetailField,
  DetailMetaRow,
  DetailPartyCard,
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
  const { fmtUsdt } = usePhysicalCurrency();
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
  const heroAccent = profitPositive ? 'emerald' : profitNegative ? 'red' : 'slate';

  const dateStr = new Date(sell.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = new Date(sell.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <>
      <Modal
        open={open && !isEditOpen}
        onClose={onClose}
        title={
          <div className="flex flex-col gap-0.5">
            <span>Physical Sell</span>
            {sell.txnId ? (
              <span className="font-mono text-xs font-medium text-slate-400">#{sell.txnId}</span>
            ) : null}
          </div>
        }
        maxWidth="max-w-[720px] w-[96vw]"
      >
        <div className="flex flex-col gap-5">
          <DetailHero
            eyebrow="Sell value"
            title={<PhysicalAmountDisplay usdtAmount={sell.totalUsdt} aedAmount={sell.sellValue} size="lg" showUnit />}
            subtitle={
              <span className={profitPositive ? 'text-emerald-700' : profitNegative ? 'text-red-700' : 'text-slate-600'}>
                {fmtUsdt(sell.profit, true)} profit
              </span>
            }
            badge={
              <DetailBadge tone={profitPositive ? 'success' : profitNegative ? 'danger' : 'neutral'}>
                {profitPositive ? 'In profit' : profitNegative ? 'Loss' : 'Break even'}
              </DetailBadge>
            }
            accent={heroAccent}
          />

          <DetailPartyCard
            label="Customer"
            name={
              <CustomerLink
                slug={slug}
                customerId={sell.customerId}
                customerName={sell.customerName || '—'}
              />
            }
            sub={physicalPaymentLabel(sell.paymentMode)}
          />

          <DetailMetaRow
            items={[
              { label: 'Date', value: dateStr },
              { label: 'Time', value: timeStr },
              { label: 'Txn ID', value: sell.txnId ?? '—', mono: true },
              { label: 'Deal #', value: sell.deal ?? '—', mono: true },
            ]}
          />

          <DetailSection title="Commercial">
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/80 p-4 sm:grid-cols-3">
              <DetailField
                label="Sell value"
                value={<PhysicalAmountDisplay usdtAmount={sell.totalUsdt} aedAmount={sell.sellValue} size="sm" showUnit={false} />}
                mono
              />
              {sell.costValue != null ? (
                <DetailField
                  label="Cost value"
                  value={<PhysicalAmountDisplay aedAmount={sell.costValue} size="sm" showUnit={false} />}
                  mono
                />
              ) : null}
              <DetailField
                label="Profit"
                value={
                  <span className={profitPositive ? 'text-emerald-700' : profitNegative ? 'text-red-700' : ''}>
                    {fmtUsdt(sell.profit, true)}
                  </span>
                }
                mono
              />
              {sell.totalUsdt != null ? (
                <DetailField label="Total USDT" value={sell.totalUsdt.toLocaleString(undefined, { maximumFractionDigits: 4 })} mono />
              ) : null}
              {sell.tltIdrValue != null ? (
                <DetailField label="Total IDR" value={sell.tltIdrValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} mono />
              ) : null}
              {(sell.narration || sell.particulars) ? (
                <DetailField label="Narration" value={sell.narration || sell.particulars || '—'} className="col-span-2 sm:col-span-3" />
              ) : null}
            </div>
          </DetailSection>

          <DetailSection title="Metal & rates">
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-white p-4 sm:grid-cols-3 md:grid-cols-4">
              <DetailField label="Gross wt" value={`${sell.grossWeight.toFixed(3)} g`} mono />
              <DetailField label="Touch" value={sell.pureConversion} />
              <DetailField label="Loss" value={sell.touchLoss?.toFixed(3) ?? '0'} mono />
              <DetailField label="Purity" value={sell.actualPurity?.toFixed(3) ?? sell.pureGram.toFixed(3)} mono />
              <DetailField label="Pure gram" value={`${sell.pureGram.toFixed(3)} g`} mono />
              <DetailField label="IDR / gram" value={sell.idrGram.toLocaleString()} mono />
              <DetailField label="USDT rate" value={sell.idrToUsdt.toLocaleString()} mono />
              <DetailField label="USDT / gram" value={sell.idrRate.toLocaleString(undefined, { maximumFractionDigits: 4 })} mono />
            </div>
          </DetailSection>

          {(sourceBuy || sell.notes) && (
            <DetailSection title="Linked & notes">
              <div className="space-y-3">
                {sourceBuy ? (
                  <DetailPartyCard
                    label="Source item"
                    name={
                      buyDetailPath ? (
                        <Link href={buyDetailPath} className="text-accent hover:underline">
                          {sourceBuy.item || sourceBuy.particulars || '—'}
                        </Link>
                      ) : (
                        sourceBuy.item || sourceBuy.particulars || '—'
                      )
                    }
                  />
                ) : null}
                {sell.notes ? (
                  <p className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                    {sell.notes}
                  </p>
                ) : null}
              </div>
            </DetailSection>
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
        </div>
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
