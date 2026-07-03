'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Modal from '@/components/ui/Modal';
import { PhysicalBuy, PhysicalSell } from '@/types';
import PhysicalDetailField from './PhysicalDetailField';
import PhysicalAmountDisplay from './PhysicalAmountDisplay';
import { usePhysicalCurrency } from '@/hooks/usePhysicalCurrency';
import CustomerLink from '@/components/customers/CustomerLink';
import PhysicalSellEditModal from './PhysicalSellEditModal';
import { physicalPaymentLabel } from '@/lib/physical/paymentLabel';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import { useWriteAccess } from '@/context/RbacWriteContext';

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

  const profitTone = sell.profit > 0 ? 'text-emerald-600' : sell.profit < 0 ? 'text-red-600' : 'text-slate-800';

  return (
    <>
      <Modal
        open={open && !isEditOpen}
        onClose={onClose}
        title={
          <div className="flex flex-col gap-0.5">
            <span>Sell Deal Details</span>
            {sell.txnId ? (
              <span className="font-mono text-xs font-medium text-slate-400">#{sell.txnId}</span>
            ) : null}
          </div>
        }
        maxWidth="max-w-[800px] w-[96vw]"
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <span>{new Date(sell.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            <span>·</span>
            <span>{new Date(sell.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
            <span>·</span>
            <span className={`font-bold font-mono ${profitTone}`}>
              {fmtUsdt(sell.profit, true)} profit
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PhysicalDetailField
              label="Customer"
              value={<CustomerLink slug={slug} customerId={sell.customerId} customerName={sell.customerName || '—'} />}
            />
            <PhysicalDetailField label="Payment" value={physicalPaymentLabel(sell.paymentMode)} />
            <PhysicalDetailField
              label="Sell Value (USDT)"
              value={<PhysicalAmountDisplay aedAmount={sell.sellValue} size="sm" showUnit={false} />}
            />
            <PhysicalDetailField label="Narration" value={sell.narration || sell.particulars || '—'} />
            {sourceBuy ? (
              <PhysicalDetailField
                label="Source Item"
                value={
                  buyDetailPath ? (
                    <Link href={buyDetailPath} className="text-accent hover:underline">
                      {sourceBuy.item || sourceBuy.particulars || '—'}
                    </Link>
                  ) : (
                    sourceBuy.item || sourceBuy.particulars || '—'
                  )
                }
                className="col-span-2 sm:col-span-1"
              />
            ) : null}
            {sell.notes ? (
              <PhysicalDetailField label="Notes" value={sell.notes} className="col-span-2 sm:col-span-3" />
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Trade Details</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              <PhysicalDetailField label="Gross Wt" value={`${sell.grossWeight.toFixed(3)} g`} />
              <PhysicalDetailField label="Touch" value={sell.pureConversion} />
              <PhysicalDetailField label="Loss" value={sell.touchLoss?.toFixed(3) ?? '0'} />
              <PhysicalDetailField label="Purity" value={sell.actualPurity?.toFixed(3) ?? sell.pureGram.toFixed(3)} />
              <PhysicalDetailField label="Pure Gram" value={`${sell.pureGram.toFixed(3)} g`} />
              <PhysicalDetailField label="IDR / Gram" value={sell.idrGram.toLocaleString()} />
              <PhysicalDetailField label="USDT Rate" value={sell.idrToUsdt.toLocaleString()} />
              <PhysicalDetailField label="USDT / Gram" value={sell.idrRate.toLocaleString(undefined, { maximumFractionDigits: 4 })} />
              {sell.costValue != null ? (
                <PhysicalDetailField
                  label="Cost Value (USDT)"
                  value={<PhysicalAmountDisplay aedAmount={sell.costValue} size="sm" showUnit={false} />}
                />
              ) : null}
              {sell.totalUsdt != null ? (
                <PhysicalDetailField label="Total USDT" value={sell.totalUsdt.toLocaleString(undefined, { maximumFractionDigits: 4 })} />
              ) : null}
              {sell.tltIdrValue != null ? (
                <PhysicalDetailField label="Total IDR" value={sell.tltIdrValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
              ) : null}
              {sell.deal != null ? <PhysicalDetailField label="Deal" value={sell.deal} /> : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className={btnSecondary}
            >
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
              Edit Deal
            </button>
          </div>
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
