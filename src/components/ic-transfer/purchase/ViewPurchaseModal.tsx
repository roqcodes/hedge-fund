'use client';

import React from 'react';
import Modal from '@/components/ui/Modal';
import { ICPurchase } from '@/types';
import { useApp } from '@/context/AppContext';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import { btnSecondary } from '@/lib/ui';

type Props = {
  open: boolean;
  onClose: () => void;
  purchase: ICPurchase | null;
};

export default function ViewPurchaseModal({ open, onClose, purchase }: Props) {
  const { icSuppliers, icWarehouses, icRegions, updateICPurchase, deleteICPurchase } = useApp();

  if (!purchase) return null;

  const handleTogglePaid = async () => {
    const newStatus = purchase.paymentStatus === 'paid' ? 'pending' : 'paid';
    await updateICPurchase(purchase.id, { paymentStatus: newStatus });
    onClose();
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this purchase?')) {
      await deleteICPurchase(purchase.id);
      onClose();
    }
  };

  const getSupplierName = (id?: string) => icSuppliers.find(s => s.id === id)?.name || id || 'Unknown';
  const getWarehouseName = (id?: string) => icWarehouses.find(w => w.id === id)?.name || id || 'Unknown';
  const getLocationName = (id?: string) => icRegions.find(r => r.id === id)?.name || id || 'Unknown';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Purchase Details"
      maxWidth="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <button 
            type="button" 
            onClick={handleDelete}
            className="rounded-lg px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>Close</button>
          <button 
            type="button" 
            onClick={handleTogglePaid}
            className={`inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-bold shadow-sm transition-all duration-150 active:scale-95 ${
              purchase.paymentStatus === 'paid' 
              ? 'border-amber-200 bg-amber-50 text-amber-600 hover:border-amber-400 hover:bg-amber-100' 
              : 'border-green-200 bg-green-50 text-green-600 hover:border-green-400 hover:bg-green-100'
            }`}
          >
            {purchase.paymentStatus === 'paid' ? 'Mark as Pending' : 'Mark as Paid'}
          </button>
          </div>
        </div>
      }
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Transaction ID</p>
            <p className="font-mono text-sm font-semibold text-slate-900">{getFormattedTxnId(purchase.id, 'purchase', purchase)}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Date</p>
            <p className="font-semibold text-slate-900">{new Date(purchase.createdAt || '').toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</p>
            <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              purchase.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {purchase.paymentStatus || 'pending'}
            </span>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Supplier Info</p>
            <p className="mt-1 font-semibold text-slate-900">{getSupplierName(purchase.supplierId)}</p>
            <p className="text-sm text-slate-500">Location: {getLocationName(purchase.locationId)}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Warehouse</p>
            <p className="mt-1 font-semibold text-slate-900">{getWarehouseName(purchase.warehouseId)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Units</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{purchase.units.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Unit Rate</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{purchase.unitRate.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 p-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total AED</p>
              <p className="mt-1 text-xl font-bold text-accent">{(purchase.aedTotal || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total INR</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{(purchase.convertedTotal || 0).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Method</p>
            <p className="font-semibold capitalize text-slate-900">{purchase.paymentMethod || '-'}</p>
          </div>
          
          {purchase.notes && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes</p>
              <p className="text-sm text-slate-700">{purchase.notes}</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
