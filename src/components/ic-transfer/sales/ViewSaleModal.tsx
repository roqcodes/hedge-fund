'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import { ICSale } from '@/types';
import { useApp } from '@/context/AppContext';
import { btnSecondary } from '@/lib/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  sale: ICSale | null;
};

export default function ViewSaleModal({ open, onClose, sale }: Props) {
  const { icRegions, updateICSale } = useApp();

  if (!sale) return null;

  const handleTogglePaid = async () => {
    const newStatus = sale.paymentStatus === 'paid' ? 'pending' : 'paid';
    await updateICSale(sale.id, { paymentStatus: newStatus });
    onClose();
  };

  const getLocationName = (id?: string) => icRegions.find(r => r.id === id)?.name || id || 'Unknown';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sale Details"
      maxWidth="max-w-2xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>Close</button>
          <button 
            type="button" 
            onClick={handleTogglePaid}
            className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-bold shadow-sm transition-all duration-150 active:scale-95 ${
              sale.paymentStatus === 'paid' 
              ? 'border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-400 hover:bg-amber-100' 
              : 'border-green-200 bg-green-50 text-green-600 hover:border-green-400 hover:bg-green-100'
            }`}
          >
            {sale.paymentStatus === 'paid' ? 'Mark as Pending' : 'Mark as Paid'}
          </button>
        </>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Transaction ID</p>
            <p className="font-mono text-sm font-semibold text-slate-900">{sale.id}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Date</p>
            <p className="font-semibold text-slate-900">{new Date(sale.createdAt || '').toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</p>
            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              sale.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {sale.paymentStatus || 'pending'}
            </span>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Customer Info</p>
            <p className="mt-1 font-semibold text-slate-900">{sale.customerName}</p>
            <p className="text-sm text-slate-500">Location: {getLocationName(sale.locationId)}</p>
          </div>
          {sale.address && (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Delivery Address</p>
              <p className="mt-1 text-sm text-slate-900">{sale.address}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Units</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{sale.units.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Unit Rate</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{sale.unitRate.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total AED</p>
              <p className="mt-1 text-xl font-bold text-accent">{(sale.aedAmount || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total INR</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{(sale.inrAmount || 0).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Mode</p>
            <p className="font-semibold capitalize text-slate-900">{sale.paymentMode || '-'}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
