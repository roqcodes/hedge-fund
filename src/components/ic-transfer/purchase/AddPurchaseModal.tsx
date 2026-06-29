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
  const { icSuppliers, icWarehouses, addICPurchase, updateICPurchase, icPurchases, icRateGroups, entities, user } = useApp();
  const [units, setUnits] = useState(initialData?.units?.toString() || '');
  const [rate, setRate] = useState(initialData?.unitRate?.toString() || '');
  const [supplierId, setSupplierId] = useState(initialData?.supplierId || '');
  const [warehouseId, setWarehouseId] = useState(initialData?.warehouseId || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const selectedSupplierId = icSuppliers.find(s => s.id === supplierId || s.name === supplierId)?.id;
  const applicableGroup = icRateGroups.find(g => 
    (selectedSupplierId && g.customerIds?.includes(selectedSupplierId)) || 
    (user?.branchId && g.branchIds?.includes(user.branchId))
  );

  const groupCurrency = applicableGroup?.currency || 'Currency';
  const groupSaleRate = applicableGroup?.saleRate || 0;
  const groupConversionRate = applicableGroup?.conversionRate || 1;

  const selectedPurchases = icPurchases.filter(p => p.supplierId === supplierId && p.warehouseId === warehouseId);
  const totalStock = selectedPurchases.reduce((acc, p) => acc + (p.units || 0), 0);
  const averageRate = selectedPurchases.length 
    ? selectedPurchases.reduce((acc, p) => acc + (p.unitRate || 0), 0) / selectedPurchases.length 
    : 0;

  React.useEffect(() => {
    if (open) {
      setNow(new Date());
      setUnits(initialData?.units?.toString() || '');
      setRate(initialData?.unitRate?.toString() || '');
      setSupplierId(initialData?.supplierId || '');
      setWarehouseId(initialData?.warehouseId || '');
      setNotes(initialData?.notes || '');
      
    }
  }, [open, initialData]);

  const unitNum = parseFloat(units) || 0;
  const rateNum = parseFloat(rate) || groupSaleRate;
  const aedBaseTotal = unitNum * rateNum;
  const convertedTotal = aedBaseTotal * groupConversionRate;
  
  const inrConversionRate = rateNum > 0 ? 1000 / rateNum : 0;
  const inrTotal = aedBaseTotal * inrConversionRate;

  const handleSubmit = async () => {
    if (!unitNum || !rateNum || !supplierId || !warehouseId) return;
    setIsSubmitting(true);
    
    const payload = {
      supplierId,
      warehouseId,
      locationId: icWarehouses.find(w => w.id === warehouseId)?.regionId || undefined,
      unitRate: rateNum,
      units: unitNum,
      notes,
      convertedTotal: convertedTotal,
      aedTotal: aedBaseTotal,
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
          <button type="button" className={btnPrimary} onClick={handleSubmit} disabled={isSubmitting || !unitNum || !rateNum || !supplierId || !warehouseId}>
            {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Purchase')}
          </button>
        </>
      }
    >
      {applicableGroup && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500 uppercase tracking-wider">Applicable Rate Group: {applicableGroup.name}</span>
          </div>
          <div className="flex gap-4">
            <div>
              <span className="font-semibold text-slate-400 uppercase">Rate ({groupCurrency}):</span>{' '}
              <span className="font-bold text-accent">{groupSaleRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

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
            <label className={formLabel}>Select Supplier</label>
            <select className={formSelect} value={supplierId} onChange={e => setSupplierId(e.target.value)}>
              <option value="" disabled>Supplier</option>
              {icSuppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Unit Rate</label>
              <input className={formInput} value={rate} onChange={e => setRate(e.target.value)} type="number" step="any" />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Number of Units</label>
              <input className={formInput} value={units} onChange={e => setUnits(e.target.value)} type="number" step="any" />
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
          {warehouseId && supplierId && (
            <div className="mb-4 rounded-xl bg-slate-100 p-3 flex justify-between items-center border border-slate-200">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Stock:</span>
              <span className="text-sm font-bold text-slate-900">{totalStock.toLocaleString()} units @ AED {averageRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} avg</span>
            </div>
          )}
          <div className={formGroup}>
            <label className={formLabel}>Notes</label>
            <textarea className={formTextarea} rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f5f0e8] p-4">
            <div className="text-center border-r border-amber-900/10">
              <p className="text-[10px] font-semibold text-slate-500">Amount (INR)</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{inrTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Rate: {inrConversionRate.toFixed(4)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold text-slate-500">Amount (AED)</p>
              <p className="text-sm font-bold text-slate-900 mt-1">{aedBaseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-[#f5f0e8] p-4 text-center">
            <p className="text-xs font-semibold text-slate-500">Total Due</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-0.5">{aedBaseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED</p>
            <p className="mt-1 text-[10px] text-slate-400">Due Date: —</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
