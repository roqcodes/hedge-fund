'use client';
import React, { useState, useMemo, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatAEDStr } from '@/data/mockData';
import { Branch, DealInvestor, DealStaffAssignment } from '@/types';
import DealStaffAssignmentModal from './DealStaffAssignmentModal';
import DealInvestorAssignmentModal from './DealInvestorAssignmentModal';
import { hasFullBranchAccess } from '@/lib/rbac';
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

export default function CreateDealModal({
  open,
  onClose,
  isBranchView,
  branches,
}: {
  open: boolean;
  onClose: () => void;
  isBranchView?: boolean;
  branches?: Branch[];
}) {
  const { investors, addDeal, user, currentSlug } = useApp();

  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState<'gold' | 'currency'>('gold');
  const [amountStr, setAmountStr] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadAddress, setLeadAddress] = useState('');
  const [savedInvestors, setSavedInvestors] = useState<DealInvestor[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<DealStaffAssignment[]>([]);
  const [showInvestorModal, setShowInvestorModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [error, setError] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    const tzoffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
  });
  
  const isAdmin = user?.role === 'admin' && !isBranchView;
  const canAssignStaff = hasFullBranchAccess(user);
  const branchSlugForStaff = isBranchView ? currentSlug : undefined;
  const [managingBranchId, setManagingBranchId] = useState('');

  useEffect(() => {
    if (open && isBranchView && branches?.length === 1) {
      setManagingBranchId(branches[0].id);
    } else if (!open) {
      setManagingBranchId(isAdmin ? '' : (user?.branchId || ''));
    }
  }, [open, isBranchView, branches, isAdmin, user]);

  const parseSafeNumber = (val: string | number) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const parsed = parseFloat(val.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  const dealAmount = parseSafeNumber(amountStr);
  const investorCount = savedInvestors.length;

  const isDirty = useMemo(() => {
    return (
      groupName.trim() !== '' ||
      amountStr.trim() !== '' ||
      leadName.trim() !== '' ||
      leadPhone.trim() !== '' ||
      leadEmail.trim() !== '' ||
      leadAddress.trim() !== '' ||
      investorCount > 0 ||
      staffAssignments.length > 0
    );
  }, [groupName, amountStr, leadName, leadPhone, leadEmail, leadAddress, investorCount, staffAssignments.length]);

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

    if (!groupName.trim()) return setError('Group name is required.');
    if (dealAmount <= 0) return setError('Group capital must be greater than zero.');
    if (!date) return setError('Creation date is required.');

    const validInvestors = savedInvestors;

    addDeal({
      name: groupName.trim(), // Use groupName as the deal name
      groupName: groupName.trim(),
      groupType,
      amount: dealAmount,
      investors: validInvestors,
      totalInvestment: dealAmount, // Explicitly force totalInvestment to match dealAmount due to 100% validation
      balance: 0,
      managingBranchId: isBranchView && branches?.length === 1 ? branches[0].id : (managingBranchId || undefined),
      status: 'active',
      totalPL: 0,
      expense: 0,
      managerShare: 20, // Default management share
      goldVolume: 0,
      leadName: leadName.trim() || undefined,
      leadPhone: leadPhone.trim() || undefined,
      leadEmail: leadEmail.trim(),
      leadAddress: leadAddress.trim(),
      date: new Date(date).toISOString(),
      staffAssignments: canAssignStaff ? staffAssignments : undefined,
    });

    // Reset and close
    setGroupName('');
    setGroupType('gold');
    setAmountStr('');
    setLeadName('');
    setLeadPhone('');
    setLeadEmail('');
    setLeadAddress('');
    setSavedInvestors([]);
    setStaffAssignments([]);
    setShowInvestorModal(false);
    setShowStaffModal(false);
    const d = new Date();
    const tzoffset = d.getTimezoneOffset() * 60000;
    setDate(new Date(d.getTime() - tzoffset).toISOString().slice(0, 16));
    setError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Create Group"
      footer={
        <>
          <button type="button" className={`${btnSecondary}`} onClick={handleClose}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary}`} onClick={handleSubmit}>
            Create Group
          </button>
        </>
      }
    >
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Group Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGroupType('gold')}
              className={`flex-1 rounded-lg border py-2 text-sm font-bold transition-colors ${groupType === 'gold' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
            >
              Gold
            </button>
            <button
              type="button"
              onClick={() => setGroupType('currency')}
              className={`flex-1 rounded-lg border py-2 text-sm font-bold transition-colors ${groupType === 'currency' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
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
          <label className={formLabel}>Group Name</label>
          <input className={formInput} type="text" placeholder="e.g. Q3 Syndicate" value={groupName} onChange={e => setGroupName(e.target.value)} />
        </div>
      </div>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Group Capital (AED)</label>
          <input className={formInput} type="number" placeholder="0.00" value={amountStr} onChange={e => setAmountStr(e.target.value)} />
        </div>
        <div className={formGroup}>
          {!isBranchView && isAdmin && (
            <>
              <label className={formLabel}>Managing Branch (Optional)</label>
              <select className={formSelect} value={managingBranchId} onChange={e => setManagingBranchId(e.target.value)}>
                <option value="">Global / Unassigned</option>
                {branches?.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </>
          )}
        </div>
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

      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-800">Investors</p>
          <p className="text-xs text-slate-500">
            {investorCount === 0
              ? 'No investors assigned yet'
              : `${investorCount} investor${investorCount === 1 ? '' : 's'} assigned`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInvestorModal(true)}
          className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Manage
        </button>
      </div>

      {canAssignStaff && branchSlugForStaff && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800">Assigned Staff</p>
            <p className="text-xs text-slate-500">
              {staffAssignments.length === 0
                ? 'No staff assigned yet'
                : `${staffAssignments.length} staff member${staffAssignments.length === 1 ? '' : 's'} assigned`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowStaffModal(true)}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Manage
          </button>
        </div>
      )}

      {error ? <p className={`${formError} mb-4`}>{error}</p> : null}

      <DealInvestorAssignmentModal
        open={showInvestorModal}
        onClose={() => setShowInvestorModal(false)}
        dealAmount={dealAmount}
        investors={investors}
        dealInvestors={savedInvestors}
        onSave={async (nextInvestors) => {
          setSavedInvestors(nextInvestors);
        }}
      />

      {canAssignStaff && branchSlugForStaff && (
        <DealStaffAssignmentModal
          open={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          branchSlug={branchSlugForStaff}
          assignments={staffAssignments}
          onChange={setStaffAssignments}
        />
      )}
    </Modal>
  );
}
