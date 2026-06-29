'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formGroup, formInput, formLabel, formRow, formSelect } from '@/lib/ui';
import { useApp } from '@/context/AppContext';
import { getCustomersBySlug, getAllCustomers } from '@/app/actions/customerActions';

import { ICSale } from '@/types';

type Props = {
  open: boolean;
  onClose: () => void;
  initialData?: ICSale;
};

export default function AddSaleModal({ open, onClose, initialData }: Props) {
  const { icWarehouses, addICSale, updateICSale, icRateGroups, user, currentSlug } = useApp();
  const [units, setUnits] = useState(initialData?.units?.toString() || '');
  const [rate, setRate] = useState(initialData?.unitRate?.toString() || '');
  const [customerName, setCustomerName] = useState(initialData?.customerName || '');
  const [warehouseId, setWarehouseId] = useState(initialData?.warehouseId || '');
  const [transactionType, setTransactionType] = useState(initialData?.transactionType || 'transfer');
  const [serviceCharge, setServiceCharge] = useState(initialData?.serviceCharge?.toString() || '');
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
  
  const applicableGroup = icRateGroups.find(g => 
    (selectedCustomerId && g.customerIds?.includes(selectedCustomerId)) || 
    (user?.branchId && g.branchIds?.includes(user.branchId))
  );

  const groupCurrency = applicableGroup?.currency || 'Currency';
  const groupSaleRate = applicableGroup?.saleRate || 0;

  React.useEffect(() => {
    if (open) {
      setUnits(initialData?.units?.toString() || '');
      setRate(initialData?.unitRate?.toString() || '');
      setCustomerName(initialData?.customerName || '');
      setWarehouseId(initialData?.warehouseId || '');
      setTransactionType(initialData?.transactionType || 'transfer');
      setServiceCharge(initialData?.serviceCharge?.toString() || '');
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
  const serviceChargeNum = parseFloat(serviceCharge) || 0;
  
  const aedBaseTotal = unitNum * rateNum;
  const aedNetTotal = Math.max(0, aedBaseTotal - serviceChargeNum);
  
  const inrConversionRate = rateNum > 0 ? 1000 / rateNum : 0;
  const inrTotal = aedBaseTotal * inrConversionRate;

  const handleSubmit = async () => {
    if (!unitNum || !rateNum || !customerName) return;
    setIsSubmitting(true);
    
    const payload = {
      customerName,
      warehouseId,
      transactionType,
      unitRate: rateNum,
      units: unitNum,
      convertedAmount: inrTotal,
      aedAmount: aedNetTotal,
      serviceCharge: serviceChargeNum,
      address: address || undefined,
      imageUrl: imageUrl || undefined,
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
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSubmitting || isUploading}>Cancel</button>
          <button type="button" className={btnPrimary} onClick={handleSubmit} disabled={isSubmitting || isUploading || !unitNum || !rateNum || !customerName}>
            {isSubmitting ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Sale')}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className={formGroup}>
            <label className={formLabel}>Customer Name</label>
            <ComboSearchInput
              value={customerName}
              onChange={setCustomerName}
              options={customers.map(c => ({ value: c.id, label: c.name }))}
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
                <option value="transfer">Transfer</option>
                <option value="cdm">CDM</option>
                <option value="by_hand">By Hand</option>
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
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Address / Description</label>
              <textarea 
                className={`${formInput} min-h-[90px] resize-y py-2.5`} 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="Enter delivery address or description details"
                rows={3}
              />
            </div>
          </div>
          <div className={formRow}>
            <div className={formGroup}>
              <label className={formLabel}>Captured Image</label>
              <div className="flex items-center gap-3 mt-2">
                {imageUrl ? (
                  <div className="relative w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden group shrink-0">
                    <img src={imageUrl} alt="Captured" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute inset-0 bg-black/50 text-white text-[9px] font-semibold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleDeleteImage}
                    >
                      Delete
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <label className={`${btnSecondary} text-xs py-2.5 px-3.5 flex items-center gap-1.5 cursor-pointer select-none`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {isUploading ? 'Uploading...' : 'Capture Image'}
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 flex flex-col justify-center">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f5f0e8] p-4">
            <div className="text-center border-r border-amber-900/10">
              <p className="text-[10px] font-semibold text-slate-500">Amount (INR)</p>
              <p className="text-base font-bold text-slate-900 mt-1">{inrTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Rate: {inrConversionRate.toFixed(4)}</p>
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
