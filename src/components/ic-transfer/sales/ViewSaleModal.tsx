'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { ICSale } from '@/types';
import { useApp } from '@/context/AppContext';
import { btnSecondary } from '@/lib/ui';
import { ConfirmModal } from '@/components/warehouse/shared';

type Props = {
  open: boolean;
  onClose: () => void;
  sale: ICSale | null;
  onEdit?: (sale: ICSale) => void;
};

export default function ViewSaleModal({ open, onClose, sale, onEdit }: Props) {
  const { icWarehouses, updateICSale, deleteICSale, user } = useApp();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (!sale) return null;

  const handleTogglePaid = async () => {
    const newStatus = sale.paymentStatus === 'paid' ? 'pending' : 'paid';
    await updateICSale(sale.id, { paymentStatus: newStatus });
    onClose();
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    await deleteICSale(sale.id);
    setDeleteLoading(false);
    setConfirmDeleteOpen(false);
    onClose();
  };

  const getWarehouseName = (id?: string) => icWarehouses.find((w: any) => w.id === id)?.name || id || 'None';

  const formatAED = (val: any) => {
    return Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' AED';
  };

  const remaining = Math.max(0, Number(sale.aedAmount || 0) - Number(sale.collectedAmount || 0));

  return (
    <>
      <Modal
      open={open}
      onClose={onClose}
      title="Sale Details"
      maxWidth="max-w-4xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={() => setConfirmDeleteOpen(true)}
            className="rounded-lg px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>Close</button>
            {onEdit && (
              <button 
                type="button" 
                onClick={() => {
                  onClose();
                  onEdit(sale);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Edit
              </button>
            )}
            {user?.role !== 'branch_manager' && (
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
            )}
          </div>
        </div>
      }
    >
      <div className="grid gap-8 md:grid-cols-2">
        {/* Left Column: Details */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Transaction ID</p>
            <p className="font-mono text-sm font-semibold text-slate-900">{sale.id}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Date</p>
            <p className="font-semibold text-slate-900">{new Date(sale.createdAt || '').toLocaleString()}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Status</p>
              <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                sale.paymentStatus === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {sale.paymentStatus || 'pending'}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Delivery Status</p>
              <span className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                sale.deliveryStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                sale.deliveryStatus === 'Partial' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-slate-50 text-slate-700 border-slate-200'
              }`}>
                {sale.deliveryStatus || 'Pending'}
              </span>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Transaction Type</p>
            <p className="mt-1 font-semibold text-slate-900 capitalize">{sale.transactionType?.replace('_', ' ') || 'By Hand'}</p>
          </div>
          {sale.deliveryAgentName && (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Agent</p>
              <p className="mt-1 font-semibold text-slate-900">{sale.deliveryAgentName}</p>
            </div>
          )}
          {sale.address ? (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Address</p>
              <p className="mt-1 font-semibold text-slate-900">{sale.address}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Warehouse</p>
              <p className="mt-1 font-semibold text-slate-900">{getWarehouseName(sale.warehouseId)}</p>
            </div>
          )}
        </div>

        {/* Right Column: Calculations & Image Previews */}
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
              <p className="mt-1 text-xl font-bold text-accent">{formatAED(sale.aedAmount)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total INR</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{(sale.inrAmount || 0).toLocaleString()} INR</p>
            </div>
          </div>

          {(sale.collectedAmount !== undefined && Number(sale.collectedAmount) > 0) && (
            <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 p-4 bg-slate-50/50">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Collected Amount</p>
                <p className="mt-1 text-lg font-bold text-emerald-600">{formatAED(sale.collectedAmount)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Remaining Amount</p>
                <p className="mt-1 text-lg font-bold text-amber-600">{formatAED(remaining)}</p>
              </div>
            </div>
          )}

          {sale.serviceCharge !== undefined && sale.serviceCharge > 0 && (
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Service Charge</p>
              <p className="mt-1 text-xl font-bold text-slate-900">{sale.serviceCharge.toLocaleString()} AED</p>
            </div>
          )}

          {/* Captured Images */}
          <div className="flex gap-4">
            {sale.imageUrl && (
              <div className="rounded-xl bg-slate-50 p-3 shrink-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Order Image</p>
                <a 
                  href={sale.imageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="mt-1.5 block w-24 h-24 rounded-xl overflow-hidden border border-slate-200 hover:opacity-85 transition-opacity"
                >
                  <img src={sale.imageUrl} alt="Captured" className="w-full h-full object-cover" />
                </a>
              </div>
            )}
            {sale.deliveryImageUrl && (
              <div className="rounded-xl bg-slate-50 p-3 shrink-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Delivery Proof</p>
                <a 
                  href={sale.deliveryImageUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="mt-1.5 block w-24 h-24 rounded-xl overflow-hidden border border-slate-200 hover:opacity-85 transition-opacity"
                >
                  <img src={sale.deliveryImageUrl} alt="Delivery proof" className="w-full h-full object-cover" />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>

    <ConfirmModal
      open={confirmDeleteOpen}
      title="Delete Sale"
      message="Are you sure you want to delete this sale? This action cannot be undone."
      confirmLabel="Delete Sale"
      variant="danger"
      loading={deleteLoading}
      onConfirm={handleDelete}
      onCancel={() => setConfirmDeleteOpen(false)}
    />
  </>
  );
}
