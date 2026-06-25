'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel, formRow, formSelect, formTextarea } from '@/lib/ui';
import { useApp } from '@/context/AppContext';

import { ICPurchase } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  initialData?: ICPurchase;
};

export default function AddPurchaseModal({ open, onClose, initialData }: Props) {
  const { icSuppliers, icWarehouses, icRegions, addICPurchase, updateICPurchase } = useApp();
  const [units, setUnits] = useState(initialData?.units?.toString() || '');
  const [rate, setRate] = useState(initialData?.unitRate?.toString() || '');
  const [supplierId, setSupplierId] = useState(initialData?.supplierId || '');
  const [locationId, setLocationId] = useState(initialData?.locationId || '');

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocId = e.target.value;
    setLocationId(newLocId);
    
    // Clear supplier if it doesn't match the new location
    const currentSupplier = icSuppliers.find(s => s.id === supplierId);
    if (currentSupplier && currentSupplier.regionId !== newLocId) {
      setSupplierId('');
    }
  };
  const [warehouseId, setWarehouseId] = useState(initialData?.warehouseId || '');
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || 'credit');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  React.useEffect(() => {
    if (open) {
      setNow(new Date());
      setUnits(initialData?.units?.toString() || '');
      setRate(initialData?.unitRate?.toString() || '');
      setSupplierId(initialData?.supplierId || '');
      setLocationId(initialData?.locationId || '');
      setWarehouseId(initialData?.warehouseId || '');
      setPaymentMethod(initialData?.paymentMethod || 'credit');
      setNotes(initialData?.notes || '');
    }
  }, [open, initialData]);

  const unitNum = parseFloat(units) || 0;
  const rateNum = parseFloat(rate) || 0;
  const inrTotal = unitNum * rateNum * 25; // using mock multiplier for now
  const aedTotal = unitNum * rateNum;

  const handleSubmit = async () => {
    if (!unitNum || !rateNum) return;
    setIsSubmitting(true);
    
    const payload = {
      supplierId,
      locationId,
      warehouseId,
      unitRate: rateNum,
      units: unitNum,
      paymentMethod,
      notes,
      inrTotal,
      aedTotal,
    };

    if (initialData) {
      await updateICPurchase(initialData.id, payload);
    } else {
      await addICPurchase(payload);
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Edit Purchase" : "Add Purchase"}
      maxWidth="max-w-4xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={handleSubmit} disabled={isSubmitting || !unitNum || !rateNum}>
            {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Purchase')}
          </button>
        </>
      }
    >
      <div className="mb-4 flex flex-wrap gap-4 text-sm text-slate-600">
        <span className="flex items-center gap-1.5">
          <svg className="size-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {now ? now.toLocaleDateString() : '...'}
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="size-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {now ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className={formGroup}>
            <label className={formLabel}>Location</label>
            <select className={formSelect} value={locationId} onChange={handleLocationChange}>
              <option value="" disabled>Select Location</option>
              {icRegions.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Select Supplier</label>
            <select className={formSelect} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="" disabled>Supplier</option>
              {icSuppliers
                .filter(s => !locationId || s.regionId === locationId)
                .map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Unit Rate</label>
              <input className={formInput} value={rate} onChange={e => setRate(e.target.value)} type="number" step="0.01" />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Number of Unit</label>
              <input className={formInput} value={units} onChange={e => setUnits(e.target.value)} type="number" step="0.01" />
            </div>
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Warehouse</label>
            <select className={formSelect} value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
              <option value="" disabled>Select Warehouse</option>
              {icWarehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Payment Method</label>
            <select className={formSelect} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
              <option value="credit">Credit</option>
              <option value="cash">Cash</option>
            </select>
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Notes</label>
            <textarea className={formTextarea} rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#f5f0e8] p-4">
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">INR</p>
              <p className="text-2xl font-bold text-slate-900">{inrTotal.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">AED</p>
              <p className="text-2xl font-bold text-slate-900">{aedTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#f5f0e8] p-4">
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">Payment</p>
              <p className="text-2xl font-bold text-slate-900">0</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-slate-500">Due Amount</p>
              <p className="text-2xl font-bold text-slate-900">{aedTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-[#f5f0e8] p-4 text-center">
            <p className="text-xs font-semibold text-slate-500">Total Due</p>
            <p className="text-3xl font-bold text-slate-900">{aedTotal.toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-400">Due Date: —</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
