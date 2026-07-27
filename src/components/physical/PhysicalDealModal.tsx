'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import PhysicalDealBuyForm from './PhysicalDealBuyForm';
import PhysicalDealSellForm from './PhysicalDealSellForm';
import { PhysicalBuy } from '@/types';
import type { PhysicalDraftBuy, PhysicalDraftSell } from '@/lib/physical/drafts';

interface PhysicalDealModalProps {
  open: boolean;
  slug: string;
  branchId: string;
  availableBuys?: PhysicalBuy[];
  onClose: () => void;
  onSuccess: () => void;
  onSaveDraftBuy?: (draft: PhysicalDraftBuy) => void;
  onSaveDraftSell?: (draft: PhysicalDraftSell) => void;
}

export default function PhysicalDealModal({
  open,
  slug,
  branchId,
  availableBuys = [],
  onClose,
  onSuccess,
  onSaveDraftBuy,
  onSaveDraftSell,
}: PhysicalDealModalProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');

  // Reset tab to buy when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab('buy');
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="relative flex w-full items-center justify-center pr-8">
          <span className="absolute left-0">New Deal</span>
          <div className="flex items-center rounded-lg bg-slate-100 p-1 w-48 border border-slate-200 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('buy')}
              className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${
                activeTab === 'buy'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Buy
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sell')}
              className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${
                activeTab === 'sell'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Sell
            </button>
          </div>
        </div>
      }
      maxWidth="max-w-[1200px] w-[96vw]"
    >
      <div className="pt-2">
        {activeTab === 'buy' ? (
          <PhysicalDealBuyForm
            slug={slug}
            branchId={branchId}
            onClose={onClose}
            onSuccess={onSuccess}
            onSaveDraft={onSaveDraftBuy}
          />
        ) : (
          <PhysicalDealSellForm
            slug={slug}
            availableBuys={availableBuys}
            onClose={onClose}
            onSuccess={onSuccess}
            onSaveDraft={onSaveDraftSell}
          />
        )}
      </div>
    </Modal>
  );
}
