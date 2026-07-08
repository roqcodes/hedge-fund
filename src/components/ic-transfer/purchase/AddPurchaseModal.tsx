'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { btnPrimary, btnSecondary, formInput, formSelect } from '@/lib/ui';
import { useApp } from '@/context/AppContext';
import { ICPurchase, ICWarehouse } from '@/types';
import RateGroupBanner from '../shared/RateGroupBanner';
import ICSaleAmountCards from '../shared/ICSaleAmountCards';
import { computeICSaleAmounts, resolveApplicableRateGroup } from '@/lib/icTransfer/rateCalculations';
import { getAdminAssignedBranchRateGroup } from '@/lib/icTransfer/branchRateScope';

type Props = {
  open: boolean;
  onClose: () => void;
  initialData?: ICPurchase;
  branchId?: string;
  warehouses?: ICWarehouse[];
};

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {children}
  </div>
);

export default function AddPurchaseModal({ open, onClose, initialData, branchId, warehouses }: Props) {
  const { icSuppliers, icWarehouses, addICPurchase, updateICPurchase, icPurchases, icRateGroups, user } = useApp();
  const warehouseOptions = warehouses ?? icWarehouses;
  const [units, setUnits] = useState(initialData?.units?.toString() || '');
  const [rate, setRate] = useState(initialData?.unitRate?.toString() || '');
  const [supplierId, setSupplierId] = useState(initialData?.supplierId || '');
  const [warehouseId, setWarehouseId] = useState(initialData?.warehouseId || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const selectedSupplierId = icSuppliers.find(s => s.id === supplierId || s.name === supplierId)?.id;
  const applicableGroup = branchId
    ? getAdminAssignedBranchRateGroup(icRateGroups, branchId)
    : resolveApplicableRateGroup(icRateGroups, {
        branchId: user?.branchId,
        customerId: selectedSupplierId,
      });

  const groupConversionRate = applicableGroup?.conversionRate || 1;
  const groupCurrency = applicableGroup?.currency || 'Currency';
  const groupSaleRate = applicableGroup?.saleRate || 0;

  const selectedPurchases = icPurchases.filter(p => p.supplierId === supplierId && p.warehouseId === warehouseId);
  const totalStock = selectedPurchases.reduce((acc, p) => acc + (p.units || 0), 0);
  const averageRate = selectedPurchases.length 
    ? selectedPurchases.reduce((acc, p) => acc + (p.unitRate || 0), 0) / selectedPurchases.length 
    : 0;

  useEffect(() => {
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
  const amounts = computeICSaleAmounts(unitNum, rateNum, groupConversionRate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNum || !rateNum || !supplierId || !warehouseId) return;
    setIsSubmitting(true);
    
    const payload = {
      supplierId,
      warehouseId,
      locationId: warehouseOptions.find(w => w.id === warehouseId)?.regionId || undefined,
      unitRate: rateNum,
      units: unitNum,
      notes,
      convertedTotal: amounts.currencyTotal,
      aedTotal: amounts.aedBaseTotal,
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
      maxWidth="max-w-[1100px] w-[95vw]"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" form="ic-purchase-form" className={btnPrimary} disabled={isSubmitting || !unitNum || !rateNum || !supplierId || !warehouseId}>
            {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Purchase')}
          </button>
        </>
      }
    >
      <form id="ic-purchase-form" onSubmit={handleSubmit} className="space-y-5">
        {applicableGroup && (
          <RateGroupBanner group={applicableGroup} ratesOnly={!!branchId} />
        )}

        <div className="mb-4 flex flex-wrap gap-4 text-xs text-slate-500 font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
            <svg className="size-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {now ? now.toLocaleDateString() : '...'}
          </span>
          <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
            <svg className="size-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {now ? now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Supplier Details & Notes */}
          <div className="space-y-4 lg:col-span-5">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Supplier Info</h3>
            
            <InputField label="Select Supplier">
              <select className={formSelect} value={supplierId} onChange={e => setSupplierId(e.target.value)} required>
                <option value="" disabled>Select Supplier</option>
                {icSuppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </InputField>

            <InputField label="Warehouse">
              {warehouseOptions.length === 0 ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  No branch warehouses configured. Add one from IC Transfer → Warehouse.
                </p>
              ) : (
                <select className={formSelect} value={warehouseId} onChange={e => setWarehouseId(e.target.value)} required>
                  <option value="" disabled>Select Warehouse</option>
                  {warehouseOptions.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              )}
            </InputField>

            {warehouseId && supplierId && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500 uppercase tracking-wider">Current Stock:</span>
                <span className="font-bold text-slate-900">{totalStock.toLocaleString()} units @ AED {averageRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} avg</span>
              </div>
            )}

            <InputField label="Notes">
              <textarea className={`${formInput} resize-none`} rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Enter purchase notes..." />
            </InputField>
          </div>

          {/* Right Column: Pricing details and Calculations */}
          <div className="space-y-4 lg:col-span-7 lg:border-l lg:pl-6 lg:border-slate-100">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Purchase Pricing</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Unit Rate (AED)">
                <input className={formInput} value={rate} onChange={e => setRate(e.target.value)} type="number" step="any" required />
              </InputField>
              
              <InputField label="Number of Units">
                <input className={formInput} value={units} onChange={e => setUnits(e.target.value)} type="number" step="any" required />
              </InputField>
            </div>

            <h3 className="border-b border-slate-100 pb-2 pt-2 text-sm font-bold text-slate-900">Calculations</h3>
            
            <ICSaleAmountCards
              inrTotal={amounts.inrTotal}
              currencyTotal={amounts.currencyTotal}
              currencyCode={groupCurrency}
              aedBaseTotal={amounts.aedBaseTotal}
              showCurrency={!!applicableGroup}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
