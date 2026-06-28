'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel, formRow, formSelect, formTextarea } from '@/lib/ui';
import { useApp } from '@/context/AppContext';

import { ICSale } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  initialData?: ICSale;
};

export default function AddSaleModal({ open, onClose, initialData }: Props) {
  const { icWarehouses, addICSale, updateICSale, entities, icRates } = useApp();
  const [units, setUnits] = useState(initialData?.units?.toString() || '');
  const [rate, setRate] = useState(initialData?.unitRate?.toString() || '');
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [warehouseId, setWarehouseId] = useState(initialData?.warehouseId || '');
  const [transactionType, setTransactionType] = useState(initialData?.transactionType || 'by_hand');
  const [serviceCharge, setServiceCharge] = useState(initialData?.serviceCharge?.toString() || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeRate = icRates.length > 0 ? icRates[0] : null;
  const saleRate = activeRate?.saleRate || 0;
  const inrConversion = activeRate?.inrConversion || 25;
  const sarConversion = activeRate?.sarConversion || 1.02;

  React.useEffect(() => {
    if (open) {
      setUnits(initialData?.units?.toString() || '');
      setRate(initialData?.unitRate?.toString() || '');
      setCustomerName(initialData?.customerName || '');
      setWarehouseId(initialData?.warehouseId || '');
      setTransactionType(initialData?.transactionType || 'by_hand');
      setServiceCharge(initialData?.serviceCharge?.toString() || '');
    }
  }, [open, initialData]);

  const unitNum = parseFloat(units) || 0;
  const rateNum = parseFloat(rate) || 0;
  const serviceChargeNum = parseFloat(serviceCharge) || 0;
  
  const aedBaseTotal = unitNum * rateNum;
  const aedNetTotal = Math.max(0, aedBaseTotal - serviceChargeNum);
  
  // Try to use existing conversion rate if editing, otherwise fallback to price settings
  const inrConversionRate = initialData ? 
    (initialData.inrAmount && initialData.aedAmount ? initialData.inrAmount / initialData.aedAmount : inrConversion) 
    : inrConversion;
  const sarConversionRate = sarConversion;

  const inrTotal = aedNetTotal * inrConversionRate;
  const sarTotal = aedNetTotal * sarConversionRate;

  const handleSubmit = async () => {
    if (!unitNum || !rateNum || !customerName) return;
    setIsSubmitting(true);
    
    const payload = {
      customerName,
      warehouseId,
      transactionType,
      unitRate: rateNum,
      units: unitNum,
      inrAmount: inrTotal,
      aedAmount: aedNetTotal,
      serviceCharge: serviceChargeNum,
      sarAmount: sarTotal,
    };

    if (initialData) {
      await updateICSale(initialData.id, payload);
    } else {
      await addICSale(payload);
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? "Edit Sale" : "Add Sale"}
      maxWidth="max-w-4xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={handleSubmit} disabled={isSubmitting || !unitNum || !rateNum || !customerName}>
            {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Sale')}
          </button>
        </>
      }
    >
      {saleRate > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500 uppercase tracking-wider">Live Sale Rates:</span>
          </div>
          <div className="flex gap-4">
            <div>
              <span className="font-semibold text-slate-400 uppercase">AED:</span>{' '}
              <span className="font-bold text-accent">{saleRate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {inrConversion > 0 && (
              <div className="border-l border-slate-200 pl-4">
                <span className="font-semibold text-slate-400 uppercase">INR:</span>{' '}
                <span className="font-bold text-emerald-600">{(saleRate * inrConversion).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {sarConversion > 0 && (
              <div className="border-l border-slate-200 pl-4">
                <span className="font-semibold text-slate-400 uppercase">SAR:</span>{' '}
                <span className="font-bold text-indigo-600">{(saleRate * sarConversion).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className={formGroup}>
            <label className={formLabel}>Customer Name</label>
            <ComboSearchInput
              value={customerName}
              onChange={setCustomerName}
              options={entities.map(e => ({ value: e.id, label: e.name }))}
              placeholder="Search customer or type name..."
            />
          </div>
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Warehouse (Optional)</label>
              <select className={formSelect} value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                <option value="">None</option>
                {icWarehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Transaction Type</label>
              <select className={formSelect} value={transactionType} onChange={e => setTransactionType(e.target.value)}>
                <option value="by_hand">By Hand</option>
                <option value="transfer">Transfer</option>
                <option value="cdm">CDM</option>
              </select>
            </div>
          </div>
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Unit Rate</label>
              <input className={formInput} value={rate} onChange={e => setRate(e.target.value)} type="number" step="0.01" />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Units</label>
              <input className={formInput} value={units} onChange={e => setUnits(e.target.value)} type="number" step="0.01" />
            </div>
            <div className={formGroup}>
              <label className={formLabel}>Service Charge</label>
              <input className={formInput} value={serviceCharge} onChange={e => setServiceCharge(e.target.value)} type="number" step="0.01" placeholder="0.00" />
            </div>
          </div>

        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#f5f0e8] p-4">
            <div className="text-center border-r border-amber-900/10">
              <p className="text-[10px] font-semibold text-slate-500">Amount (INR)</p>
              <p className="text-base font-bold text-slate-900 mt-1">{inrTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center border-r border-amber-900/10 px-1">
              <p className="text-[10px] font-semibold text-slate-500">Amount (SAR)</p>
              <p className="text-base font-bold text-indigo-700 mt-1">{sarTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold text-slate-500">Amount (AED)</p>
              <p className="text-base font-bold text-slate-900 mt-1">{aedBaseTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-[#f5f0e8] p-4 text-center">
            <p className="text-xs font-semibold text-slate-500">Total Due</p>
            <p className="text-3xl font-extrabold text-slate-900 mt-0.5">{aedNetTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AED</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
