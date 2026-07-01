'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formInput, formSelect } from '@/lib/ui';
import { useApp } from '@/context/AppContext';
import { getCustomersBySlug, getAllCustomers } from '@/app/actions/customerActions';
import { ICSale } from '@/types';
import PrioritySelector from '../shared/PrioritySelector';
import RateGroupBanner from '../shared/RateGroupBanner';
import ICSaleAmountCards from '../shared/ICSaleAmountCards';
import { computeICSaleAmounts, resolveApplicableRateGroup } from '@/lib/icTransfer/rateCalculations';
import type { OrderPriority } from '@/types/warehouse';

type Props = {
  open: boolean;
  onClose: () => void;
  initialData?: ICSale;
};

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
    {children}
  </div>
);

export default function AddSaleModal({ open, onClose, initialData }: Props) {
  const { icWarehouses, addICSale, updateICSale, icRateGroups, user, currentSlug } = useApp();
  const [units, setUnits] = useState(initialData?.units?.toString() || '');
  const [rate, setRate] = useState(initialData?.unitRate?.toString() || '');
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [warehouseId, setWarehouseId] = useState(initialData?.warehouseId || '');
  const [transactionType, setTransactionType] = useState(initialData?.transactionType || 'transfer');
  const [priority, setPriority] = useState<OrderPriority>(initialData?.priority || 'Normal');
  const [address, setAddress] = useState(initialData?.address || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [deleteToken, setDeleteToken] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);

  // Cloudinary credentials from env
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'finite-x-reality';
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'meal_payments';

  const selectedCustomerId = customers.find(c => c.id === customerName || c.name === customerName)?.id;
  
  const applicableGroup = resolveApplicableRateGroup(icRateGroups, {
    branchId: user?.branchId,
    customerId: selectedCustomerId,
  });

  const groupConversionRate = applicableGroup?.conversionRate || 1;
  const groupCurrency = applicableGroup?.currency || 'Currency';
  const groupSaleRate = applicableGroup?.saleRate || 0;

  React.useEffect(() => {
    if (open) {
      setUnits(initialData?.units?.toString() || '');
      setRate(initialData?.unitRate?.toString() || '');
      setCustomerName(initialData?.customerName || '');
      setWarehouseId(initialData?.warehouseId || '');
      setTransactionType(initialData?.transactionType || 'transfer');
      setPriority(initialData?.priority || 'Normal');
      setAddress(initialData?.address || '');
      setImageUrl(initialData?.imageUrl || '');
      setDeleteToken('');

      const fetchCustomers = async () => {
        if (currentSlug && currentSlug !== 'superadmin') {
          const res = await getCustomersBySlug(currentSlug);
          if (res.success && res.customers) {
            setCustomers(res.customers);
          }
        } else {
          const res = await getAllCustomers();
          if (res.success && res.customers) {
            setCustomers(res.customers);
          }
        }
      };
      fetchCustomers();
    }
  }, [open, initialData, currentSlug]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setImageUrl(data.secure_url);
      setDeleteToken(data.delete_token || '');
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (deleteToken) {
      try {
        const formData = new FormData();
        formData.append('token', deleteToken);
        await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/delete_by_token`, {
          method: 'POST',
          body: formData,
        });
      } catch (err) {
        console.error('Failed to delete image from Cloudinary:', err);
      }
    }
    setImageUrl('');
    setDeleteToken('');
  };

  const unitNum = parseFloat(units) || 0;
  const rateNum = parseFloat(rate) || groupSaleRate;
  const serviceChargeNum = initialData?.serviceCharge ?? 0;

  const amounts = computeICSaleAmounts(unitNum, rateNum, groupConversionRate, serviceChargeNum);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitNum || !rateNum || !customerName) return;
    setIsSubmitting(true);
    
    const payload = {
      customerName,
      warehouseId,
      transactionType,
      unitRate: rateNum,
      units: unitNum,
      convertedAmount: amounts.currencyTotal,
      aedAmount: amounts.aedNetTotal,
      serviceCharge: serviceChargeNum,
      priority,
      address: address || undefined,
      imageUrl: imageUrl || undefined,
      conversionRate: groupConversionRate,
      currency: groupCurrency,
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
      title={initialData ? "Edit Sale" : "Register Sale"}
      maxWidth="max-w-[1100px] w-[95vw]"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSubmitting || isUploading}>Cancel</button>
          <button type="submit" form="ic-sale-form" className={btnPrimary} disabled={isSubmitting || isUploading || !unitNum || !rateNum || !customerName}>
            {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Register Sale')}
          </button>
        </>
      }
    >
      <form id="ic-sale-form" onSubmit={handleSubmit} className="space-y-5">
        {applicableGroup && <RateGroupBanner group={applicableGroup} />}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Customer details, Address and Upload */}
          <div className="space-y-4 lg:col-span-5">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Customer</h3>
            <InputField label="Customer Name">
              <ComboSearchInput
                value={customerName}
                onChange={setCustomerName}
                options={customers.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Search customer or type name..."
              />
            </InputField>

            <InputField label="Address / Description">
              <textarea 
                className={`${formInput} resize-none`} 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="Enter delivery address or description details"
                rows={3}
              />
            </InputField>

            <InputField label="Captured Image">
              <div className="flex items-center gap-3">
                {imageUrl ? (
                  <div className="relative w-20 h-20 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden group shrink-0">
                    <img src={imageUrl} alt="Captured proof" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute inset-0 bg-black/60 text-white text-[10px] font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleDeleteImage}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <label className="w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4 text-slate-400 hover:bg-slate-100/50 cursor-pointer transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-1 opacity-70">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-xs font-semibold">{isUploading ? 'Uploading...' : 'Upload Image'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </label>
                )}
              </div>
            </InputField>
          </div>

          {/* Right Column: Transaction Details, Pricing, and Totals */}
          <div className="space-y-4 lg:col-span-7 lg:border-l lg:pl-6 lg:border-slate-100">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Transaction Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Priority">
                <PrioritySelector value={priority} onChange={setPriority} disabled={isSubmitting} />
              </InputField>

              <InputField label="Warehouse (Optional)">
                <select className={formSelect} value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                  <option value="">None</option>
                  {icWarehouses.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </InputField>

              <InputField label="Transaction Type">
                <div className="flex rounded-xl bg-slate-100 p-1 w-full border border-slate-200/50 h-[46px] sm:h-[54px] items-stretch gap-1">
                  {[
                    { value: 'transfer', label: 'Transfer' },
                    { value: 'cdm', label: 'CDM' },
                    { value: 'by_hand', label: 'By Hand' }
                  ].map(opt => {
                    const isActive = transactionType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTransactionType(opt.value)}
                        className={`flex-1 text-center text-xs font-semibold rounded-lg transition-all flex items-center justify-center ${
                          isActive 
                            ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40 font-bold' 
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </InputField>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InputField label="Units">
                <input className={formInput} value={units} onChange={e => setUnits(e.target.value)} type="number" step="0.01" required />
              </InputField>

              <InputField label="Unit Rate (AED)">
                <input className={formInput} value={rate} onChange={e => setRate(e.target.value)} type="number" step="0.01" required />
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
