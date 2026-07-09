'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import ComboSearchInput from '@/components/ui/ComboSearchInput';
import { btnPrimary, btnSecondary, formInput } from '@/lib/ui';
import { useApp } from '@/context/AppContext';
import { isCustomerRole } from '@/lib/rbac';
import { shouldRecordCustomerOrderUnderBranch } from '@/lib/icTransfer/branchOrderOwnership';
import { normalizeHiddenPages } from '@/lib/branchPages';
import { getCustomersBySlug } from '@/app/actions/customerActions';
import { ICSale } from '@/types';
import { canBranchResubmitOrder } from '@/lib/icTransfer/orderStatus';
import { canBranchEditHandledOrder, isBranchHandledSale } from '@/lib/icTransfer/fulfillmentHandler';
import { branchUpdateHandledICSaleAction } from '@/app/actions/icTransferActions';
import { hasICSaleEditableFieldsChanged, type ICSaleContentFields } from '@/lib/icTransfer/saleChanges';
import { WorkflowNotice } from '../shared/orderWorkflow';
import RateGroupBanner from '../shared/RateGroupBanner';
import CopyOrderDetailsButton from '../shared/CopyOrderDetailsButton';
import TransactionTypeSelector from '../shared/TransactionTypeSelector';
import { computeICSaleAmounts, formatAmount } from '@/lib/icTransfer/rateCalculations';
import InrAmountInWords from '../shared/InrAmountInWords';
import { DEFAULT_IC_SALE_TRANSACTION_TYPE, type ICSaleTransactionType } from '@/lib/icTransfer/transactionTypes';
import { resolveBranchOrderRates } from '@/lib/icTransfer/branchRateScope';

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

export default function AddICBranchOrderModal({ open, onClose, initialData }: Props) {
  const { addICSale, resubmitICSale, branches, currentSlug, icRateGroups, user, showToast } = useApp();
  const isCustomer = isCustomerRole(user?.role);
  const isBranchManager = user?.role === 'branch_manager';
  const linkedCustomerId = user?.customerId;
  const linkedCustomerName = user?.name;
  const [units, setUnits] = useState(initialData?.units?.toString() || '');
  const [transactionType, setTransactionType] = useState(initialData?.transactionType || DEFAULT_IC_SALE_TRANSACTION_TYPE);
  const [bank, setBank] = useState(initialData?.bank || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [location, setLocation] = useState(initialData?.location || '');
  const [district, setDistrict] = useState(initialData?.district || '');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [deleteToken, setDeleteToken] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([]);
  const [customerQuery, setCustomerQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [editBaseline, setEditBaseline] = useState<Pick<
    ICSaleContentFields,
    'units' | 'transactionType' | 'address' | 'location' | 'district' | 'imageUrl' | 'bank'
  > | null>(null);
  const [handleAtBranch, setHandleAtBranch] = useState(false);

  // Cloudinary credentials from env
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'finite-x-reality';
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'meal_payments';

  // Retrieve branch info
  const currentBranch =
    branches.find(b => b.slug === currentSlug)
    ?? (user?.branchId ? branches.find(b => b.id === user.branchId) : undefined);
  const branchName = currentBranch?.name || currentSlug || 'Branch Customer';
  const currentBranchId = currentBranch?.id;

  const branchHiddenPages = normalizeHiddenPages(currentBranch?.hiddenPages);
  const recordCustomerUnderBranch = isCustomer && shouldRecordCustomerOrderUnderBranch(branchHiddenPages);

  const branchCustomerIdSet = useMemo(
    () => new Set(customers.map(c => c.id)),
    [customers],
  );

  const resolvedCustomerId = isCustomer
    ? (recordCustomerUnderBranch ? undefined : linkedCustomerId)
    : (selectedCustomerId || undefined);

  const orderRates = useMemo(() => {
    const customerId = isCustomer
      ? (recordCustomerUnderBranch ? linkedCustomerId : resolvedCustomerId)
      : (selectedCustomerId || undefined);

    return resolveBranchOrderRates(icRateGroups, {
      branchId: currentBranchId,
      customerId,
      branchCustomerIds: branchCustomerIdSet,
    });
  }, [
    icRateGroups,
    currentBranchId,
    resolvedCustomerId,
    isCustomer,
    recordCustomerUnderBranch,
    linkedCustomerId,
    selectedCustomerId,
    branchCustomerIdSet,
  ]);

  const applicableGroup = orderRates.branchGroup;
  const adminRateGroup = orderRates.adminGroup;

  const groupConversionRate = applicableGroup?.conversionRate || 1;
  const groupCurrency = applicableGroup?.currency || 'Currency';
  const groupSaleRate = applicableGroup?.saleRate || 0;
  const adminSaleRate = adminRateGroup?.saleRate;
  const adminConversionRate = adminRateGroup?.conversionRate ?? 1;

  useEffect(() => {
    if (!open || !currentSlug) return;
    getCustomersBySlug(currentSlug).then(res => {
      if (res.success && res.customers) {
        setCustomers(res.customers.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
      }
    });
  }, [open, currentSlug]);

  useEffect(() => {
    if (open) {
      setUnits(initialData?.units?.toString() || '');
      setTransactionType(initialData?.transactionType || DEFAULT_IC_SALE_TRANSACTION_TYPE);
      setBank(initialData?.bank || '');
      setAddress(initialData?.address || '');
      setLocation(initialData?.location || '');
      setDistrict(initialData?.district || '');
      setImageUrl(initialData?.imageUrl || '');
      setDeleteToken('');
      if (isCustomer && linkedCustomerId && !initialData) {
        setSelectedCustomerId(linkedCustomerId);
        setCustomerQuery(linkedCustomerName || '');
      } else {
        setSelectedCustomerId(initialData?.orderCustomerId || '');
        setCustomerQuery(initialData?.orderCustomerName || '');
      }

      if (initialData && canBranchResubmitOrder(initialData.orderStatus)) {
        setEditBaseline({
          units: initialData.units,
          transactionType: initialData.transactionType || DEFAULT_IC_SALE_TRANSACTION_TYPE,
          address: initialData.address,
          location: initialData.location,
          district: initialData.district,
          imageUrl: initialData.imageUrl,
          bank: initialData.bank || '',
        });
      } else {
        setEditBaseline(null);
      }
      setHandleAtBranch(initialData?.fulfillmentHandler === 'branch');
    }
  }, [open, initialData, isCustomer, linkedCustomerId, linkedCustomerName]);

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
  const rateNum = initialData ? initialData.unitRate : groupSaleRate;
  const serviceChargeNum = 0;

  const amounts = computeICSaleAmounts(unitNum, rateNum, groupConversionRate, serviceChargeNum);

  const isResubmitMode = !!initialData && canBranchResubmitOrder(initialData.orderStatus);
  const isBranchHandledEdit =
    !!initialData && isBranchHandledSale(initialData) && canBranchEditHandledOrder(initialData);

  const isByHand = transactionType === 'by_hand';

  const handleTransactionTypeChange = (value: ICSaleTransactionType) => {
    setTransactionType(value);
    if (value === 'by_hand') {
      setBank('');
    } else {
      setLocation('');
      setDistrict('');
    }
  };

  const trimmedCustomer = customerQuery.trim();
  const orderRecordingName = recordCustomerUnderBranch
    ? branchName
    : (linkedCustomerName || trimmedCustomer || 'your name');
  const recordedCustomerName = isCustomer
    ? (recordCustomerUnderBranch ? branchName : (linkedCustomerName || trimmedCustomer))
    : branchName;

  const payload = {
    customerName: recordedCustomerName,
    orderCustomerName: isCustomer
      ? (linkedCustomerName || trimmedCustomer || undefined)
      : (trimmedCustomer || undefined),
    orderCustomerId: isCustomer ? (linkedCustomerId || selectedCustomerId || undefined) : (selectedCustomerId || undefined),
    transactionType,
    unitRate: rateNum,
    units: unitNum,
    convertedAmount: amounts.currencyTotal,
    aedAmount: amounts.aedNetTotal,
    bank: isByHand ? undefined : (bank || undefined),
    address: address || undefined,
    location: isByHand ? location.trim() || undefined : undefined,
    district: isByHand ? district.trim() || undefined : undefined,
    imageUrl: imageUrl || undefined,
    serviceCharge: serviceChargeNum,
    conversionRate: groupConversionRate,
    currency: groupCurrency,
    adminUnitRate: adminSaleRate,
    adminConversionRate: adminSaleRate != null ? adminConversionRate : undefined,
    fulfillmentHandler: handleAtBranch ? ('branch' as const) : ('hq_admin' as const),
  };

  const contentPayload = {
    units: unitNum,
    transactionType,
    convertedAmount: amounts.currencyTotal,
    aedAmount: amounts.aedNetTotal,
    bank: isByHand ? undefined : (bank || undefined),
    address: address || undefined,
    location: isByHand ? location.trim() || undefined : undefined,
    district: isByHand ? district.trim() || undefined : undefined,
    imageUrl: imageUrl || undefined,
    serviceCharge: serviceChargeNum,
    conversionRate: groupConversionRate,
    currency: groupCurrency,
  };

  const editableSnapshot = {
    units: unitNum,
    transactionType,
    address: address || undefined,
    location: isByHand ? location.trim() || undefined : undefined,
    district: isByHand ? district.trim() || undefined : undefined,
    imageUrl: imageUrl || undefined,
    serviceCharge: serviceChargeNum,
    bank: isByHand ? undefined : (bank || undefined),
  };

  const canResubmit =
    !!editBaseline && hasICSaleEditableFieldsChanged(editBaseline, editableSnapshot);

  const submitDisabled =
    isSubmitting ||
    isUploading ||
    !unitNum ||
    !rateNum ||
    (!initialData && !trimmedCustomer && !isCustomer) ||
    (isResubmitMode && !canResubmit && !isBranchHandledEdit);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitDisabled) return;
    setIsSubmitting(true);

    if (initialData && isResubmitMode) {
      await resubmitICSale(initialData.id, contentPayload, currentSlug);
    } else if (initialData && isBranchHandledEdit) {
      await branchUpdateHandledICSaleAction(initialData.id, contentPayload, currentSlug);
    } else if (!initialData) {
      await addICSale(payload);
    }

    setIsSubmitting(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex flex-col gap-0.5">
          <span>{isBranchHandledEdit ? 'Edit Branch Order' : isResubmitMode ? 'Edit & Resubmit Order' : 'Create Transfer Order'}</span>
          <span className="text-xs font-semibold text-accent">
            {isCustomer
              ? (recordCustomerUnderBranch ? branchName : (linkedCustomerName || 'Customer'))
              : branchName}
          </span>
        </div>
      }
      maxWidth="max-w-[1100px] w-[95vw]"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose} disabled={isSubmitting || isUploading}>Cancel</button>
          <button
            type="submit"
            form="branch-order-form"
            className={`${btnPrimary} disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none motion-safe:disabled:hover:translate-y-0 motion-safe:disabled:hover:shadow-primary`}
            disabled={submitDisabled}
            title={isResubmitMode && !canResubmit ? 'Change at least one field before resubmitting' : undefined}
          >
            {isSubmitting
              ? 'Saving...'
              : isBranchHandledEdit
                ? 'Save Changes'
                : isResubmitMode
                ? 'Save & Resend to Admin'
                : 'Create Order'}
          </button>
        </>
      }
    >
      <form id="branch-order-form" onSubmit={handleSubmit} className="space-y-5">
        {isResubmitMode && initialData?.rejectionRemarks && (
          <WorkflowNotice variant="danger" title="Order rejected by admin">
            {initialData.rejectionRemarks}
            <span className="mt-1 block text-[10px] font-medium opacity-80">
              Update the order details below, then resend for admin review.
            </span>
          </WorkflowNotice>
        )}

        {applicableGroup && (
          <RateGroupBanner
            group={applicableGroup}
            displayName={isCustomer && recordCustomerUnderBranch ? branchName : undefined}
            ratesOnly={isBranchManager || user?.role === 'staff'}
          />
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Customer details, Address and Upload */}
          <div className="space-y-4 lg:col-span-5">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Customer</h3>

            <InputField label="Customer">
              {isResubmitMode || isCustomer ? (
                <input
                  className={`${formInput} bg-slate-50 text-slate-500 font-semibold cursor-not-allowed`}
                  value={customerQuery || linkedCustomerName || branchName}
                  disabled
                  readOnly
                />
              ) : (
                <ComboSearchInput
                  value={customerQuery}
                  onChange={val => {
                    setCustomerQuery(val);
                    const match = customers.find(c => c.name === val);
                    setSelectedCustomerId(match?.id || '');
                  }}
                  onSelectOption={opt => {
                    setCustomerQuery(opt.label);
                    setSelectedCustomerId(opt.value);
                  }}
                  options={customers.map(c => ({ value: c.id, label: c.name }))}
                  placeholder="Search and select a customer…"
                />
              )}
              <p className="mt-1 text-[11px] text-slate-400">
                {isCustomer
                  ? recordCustomerUnderBranch
                    ? `Your order will be recorded under ${branchName}. You are ordering as ${linkedCustomerName || 'Customer'}.`
                    : `Your order will be recorded under ${orderRecordingName}.`
                  : `Order will be recorded under ${branchName}. Select the end customer above.`}
              </p>
            </InputField>

            {!isByHand ? (
              <InputField label="Bank">
                <input 
                  type="text"
                  className={formInput} 
                  value={bank} 
                  onChange={e => setBank(e.target.value)} 
                  placeholder="Enter bank name"
                />
              </InputField>
            ) : null}

            <InputField label="Address / Description">
              <textarea 
                className={`${formInput} resize-none`} 
                value={address} 
                onChange={e => setAddress(e.target.value)} 
                placeholder="Enter delivery address details"
                rows={3}
              />
            </InputField>

            {isByHand ? (
              <>
                <InputField label="Location">
                  <input
                    type="text"
                    className={formInput}
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Enter location"
                  />
                </InputField>
                <InputField label="District">
                  <input
                    type="text"
                    className={formInput}
                    value={district}
                    onChange={e => setDistrict(e.target.value)}
                    placeholder="Enter district"
                  />
                </InputField>
              </>
            ) : null}

            <InputField label="Captured Image">
              <div className="flex flex-col gap-3">
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
                  <>
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
                    <CopyOrderDetailsButton
                      address={address}
                      units={unitNum}
                      onCopySuccess={() => showToast('Details copied')}
                      onCopyError={msg => showToast(msg, 'error')}
                    />
                  </>
                )}
              </div>
            </InputField>
          </div>

          {/* Right Column: Transaction Details, Pricing, and Totals */}
          <div className="space-y-4 lg:col-span-7 lg:border-l lg:pl-6 lg:border-slate-100">
            <h3 className="border-b border-slate-100 pb-2 text-sm font-bold text-slate-900">Transaction Details</h3>
            
            <div className="flex flex-col gap-4">
              {isBranchManager && !isCustomer && !isResubmitMode && !isBranchHandledEdit && (
                <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-slate-800">Handle at branch</span>
                    <p className="text-[10px] text-slate-500">Off = send to admin for fulfillment (your customer rate still applies)</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={handleAtBranch}
                    onClick={() => setHandleAtBranch(prev => !prev)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 ${
                      handleAtBranch ? 'bg-accent' : 'bg-slate-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 translate-y-0.5 rounded-full bg-white shadow transition-transform ${
                        handleAtBranch ? 'translate-x-[22px]' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              )}

              <div className="order-2 md:order-1">
                <InputField label="Transaction Type">
                  <TransactionTypeSelector
                    value={transactionType}
                    onChange={handleTransactionTypeChange}
                    disabled={isSubmitting}
                  />
                </InputField>
              </div>

              <div className="order-1 md:order-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Order Units">
                  <input 
                    className={formInput} 
                    value={units} 
                    onChange={e => setUnits(e.target.value)} 
                    type="number" 
                    step="0.01" 
                    placeholder="Enter units quantity"
                    required
                  />
                </InputField>

                <InputField label={`Unit Rate (${groupCurrency}) (Locked)`}>
                  <input 
                    className={`${formInput} bg-slate-50 text-slate-500 font-semibold cursor-not-allowed`} 
                    value={amounts.currencyUnitRate} 
                    disabled 
                    readOnly 
                    type="number" 
                  />
                </InputField>
              </div>
            </div>

             <h3 className="border-b border-slate-100 pb-2 pt-2 text-sm font-bold text-slate-900">Calculations</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-xl border border-slate-100 p-4 bg-slate-50/50">
              <div className="text-center p-3 rounded-xl bg-white border border-slate-100 flex flex-col justify-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Units</span>
                <span className="mt-1.5 text-base sm:text-lg font-bold text-slate-800 font-mono">
                  {formatAmount(unitNum)}
                </span>
              </div>

              <div className="text-center p-3 rounded-xl bg-white border border-slate-100 flex flex-col justify-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount (INR)</span>
                <span className="mt-1.5 text-base sm:text-lg font-bold text-slate-800 font-mono">
                  {formatAmount(amounts.inrTotal)}
                </span>
                <InrAmountInWords amount={amounts.inrTotal} />
              </div>

              {applicableGroup && (
                <div className="text-center p-3 rounded-xl bg-white border border-slate-100 flex flex-col justify-center shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Amount ({groupCurrency})
                  </span>
                  <span className="mt-1.5 text-base sm:text-lg font-bold text-slate-800 font-mono">
                    {formatAmount(amounts.currencyTotal)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
