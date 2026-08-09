'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatAEDStr } from '@/data/mockData';
import { Deal, DealStatus } from '@/types';
import {
  btnPrimary,
  btnSecondary,
  formGroup,
  formInput,
  formLabel,
  formRow,
  formSelect,
  formError,
  formHint,
} from '@/lib/ui';

export default function EditDealModal({
  open,
  onClose,
  deal,
}: {
  open: boolean;
  onClose: () => void;
  deal: Deal;
}) {
  const { updateDeal, deleteDeal, currentSlug } = useApp();
  const router = useRouter();
  const params = useParams();
  const branchSlug = params?.branchSlug as string;
  const groupBasePath = branchSlug ? `/group/${branchSlug}` : (currentSlug && currentSlug !== 'superadmin' ? `/${currentSlug}/group` : '/group');

  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<'gold' | 'currency'>('gold');

  const [amountStr, setAmountStr] = useState('');
  const [managerShareStr, setManagerShareStr] = useState('20');
  const [status, setStatus] = useState<DealStatus>('active');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadAddress, setLeadAddress] = useState('');
  const [error, setError] = useState('');
  const [date, setDate] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const syncedDealIdRef = useRef<string | null>(null);

  // Sync form when modal opens for a deal — skip background refetch updates while editing
  useEffect(() => {
    if (!open) {
      syncedDealIdRef.current = null;
      return;
    }
    if (!deal || syncedDealIdRef.current === deal.id) return;
    syncedDealIdRef.current = deal.id;

    setGroupName(deal.groupName || '');
    setGroupType(deal.groupType || 'gold');
    setAmountStr(deal.amount.toString());
    setStatus(deal.status);
    setManagerShareStr(deal.managerShare?.toString() ?? '20');
    setLeadName(deal.leadName || '');
    setLeadPhone(deal.leadPhone || '');
    setLeadEmail(deal.leadEmail || '');
    setLeadAddress(deal.leadAddress || '');

    if (deal.date) {
      const d = new Date(deal.date);
      const tzoffset = d.getTimezoneOffset() * 60000;
      setDate(new Date(d.getTime() - tzoffset).toISOString().slice(0, 16));
    } else {
      const d = new Date();
      const tzoffset = d.getTimezoneOffset() * 60000;
      setDate(new Date(d.getTime() - tzoffset).toISOString().slice(0, 16));
    }
    setError('');
  }, [open, deal]);

  const parseSafeNumber = (val: string | number) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const parsed = parseFloat(val.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  const dealAmount = parseSafeNumber(amountStr);

  const isDirty = useMemo(() => {
    if (!deal) return false;
    
    if (groupName !== (deal.groupName || '')) return true;
    if (groupType !== (deal.groupType || 'gold')) return true;
    if (amountStr !== deal.amount.toString()) return true;
    if (status !== deal.status) return true;
    if (managerShareStr !== (deal.managerShare?.toString() ?? '20')) return true;
    if (leadName !== (deal.leadName || '')) return true;
    if (leadPhone !== (deal.leadPhone || '')) return true;
    if (leadEmail !== (deal.leadEmail || '')) return true;
    if (leadAddress !== (deal.leadAddress || '')) return true;

    return false;
  }, [deal, groupName, groupType, amountStr, status, managerShareStr, leadName, leadPhone, leadEmail, leadAddress]);

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to discard them?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = () => {
    setError('');

    if (!groupName.trim()) return setError('Group Name is required.');
    if (dealAmount <= 0) return setError('Group capital must be greater than zero.');
    if (dealAmount <= 0) return setError('Group capital must be greater than zero.');

    const parsedManagerShare = parseSafeNumber(managerShareStr);
    if (isNaN(parsedManagerShare) || parsedManagerShare < 0 || parsedManagerShare > 100) {
      return setError('Manager share must be between 0 and 100.');
    }

    if (!date) return setError('Creation date is required.');

    updateDeal({
      ...deal,
      name: groupName.trim() || 'General',
      groupName: groupName.trim() || 'General',
      groupType,
      amount: dealAmount,
      goldVolume: deal.goldVolume ?? 0,
      investors: deal.investors,
      totalInvestment: deal.totalInvestment,
      balance: deal.balance,
      toBranchId: deal.toBranchId,
      toBranchName: deal.toBranchName,
      status,
      managerShare: parsedManagerShare,
      leadName: leadName.trim(),
      leadPhone: leadPhone.trim(),
      leadEmail: leadEmail.trim(),
      leadAddress: leadAddress.trim(),
      date: new Date(date).toISOString(),
      staffAssignments: deal.staffAssignments,
    });

    setError('');
    onClose();
  };

  const handleDelete = async () => {
    if (!isDeleting) {
      setIsDeleting(true);
      return;
    }

    const success = await deleteDeal(deal.id);
    if (success) {
      onClose();
      router.push(groupBasePath);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Edit Group"
      footer={
        <>
          <div className="mr-auto">
            {!isDeleting ? (
              <button
                type="button"
                onClick={() => setIsDeleting(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition-all"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete Group
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Sure?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700 transition-all"
                >
                  Yes, Delete
                </button>
                <button
                  type="button"
                  onClick={() => setIsDeleting(false)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2 ml-auto">
            <button type="button" className={`${btnSecondary}`} onClick={handleClose} disabled={isDeleting}>
              Cancel
            </button>
            <button type="button" className={`${btnPrimary}`} onClick={handleSubmit} disabled={isDeleting}>
              Save Changes
            </button>
          </div>
        </>
      }
    >
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Group Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled
              className={`flex-1 rounded-lg border py-2 text-sm font-bold transition-colors opacity-75 cursor-not-allowed ${groupType === 'gold' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
            >
              Gold
            </button>
            <button
              type="button"
              disabled
              className={`flex-1 rounded-lg border py-2 text-sm font-bold transition-colors opacity-75 cursor-not-allowed ${groupType === 'currency' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
            >
              Currency
            </button>
          </div>
        </div>
        <div className={formGroup}></div>
      </div>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Creation Date</label>
          <input
            className={formInput}
            type="datetime-local"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Group Status</label>
          <select className={formSelect} value={status} onChange={e => setStatus(e.target.value as DealStatus)}>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Group Name</label>
          <input
            className={formInput}
            type="text"
            placeholder="e.g. SPORTS"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
          />
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Management Share (%)</label>
          <input
            className={formInput}
            type="number"
            placeholder="20"
            value={managerShareStr}
            onChange={e => setManagerShareStr(e.target.value)}
            min="0"
            max="100"
          />
        </div>
      </div>

      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Group Capital (AED)</label>
          <input
            className={formInput}
            type="number"
            placeholder="0.00"
            value={amountStr}
            onChange={e => setAmountStr(e.target.value)}
          />
        </div>
        <div className={formGroup}></div>
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <h4 className="mb-4 text-sm font-bold text-slate-800">Group Lead Information</h4>
        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Lead Name</label>
            <input className={formInput} type="text" placeholder="e.g. John Doe" value={leadName} onChange={e => setLeadName(e.target.value)} />
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Lead Phone</label>
            <input className={formInput} type="tel" placeholder="+971..." value={leadPhone} onChange={e => setLeadPhone(e.target.value)} />
          </div>
        </div>
        <div className={formRow}>
          <div className={formGroup}>
            <label className={formLabel}>Lead Email</label>
            <input className={formInput} type="email" placeholder="john@example.com" value={leadEmail} onChange={e => setLeadEmail(e.target.value)} />
          </div>
          <div className={formGroup}>
            <label className={formLabel}>Lead Address</label>
            <input className={formInput} type="text" placeholder="Dubai, UAE" value={leadAddress} onChange={e => setLeadAddress(e.target.value)} />
          </div>
        </div>
      </div>

      {error ? <p className={`${formError} mb-4`}>{error}</p> : null}
    </Modal>
  );
}
