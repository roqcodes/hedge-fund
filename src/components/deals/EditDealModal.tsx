'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatAED, formatAEDStr } from '@/data/mockData';
import { Branch, Investor, Deal, DealInvestor, DealStatus } from '@/types';
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
  const { branches, investors, updateDeal } = useApp();

  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [targetType, setTargetType] = useState<'branch' | 'custom'>('branch');
  const [customEntity, setCustomEntity] = useState('');
  const [status, setStatus] = useState<DealStatus>('active');
  const [managerShareStr, setManagerShareStr] = useState('20');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadAddress, setLeadAddress] = useState('');
  const [dealInvestors, setDealInvestors] = useState<{ investorId: string; percentageStr: string }[]>([]);
  const [error, setError] = useState('');

  // Synchronize state when the modal opens or the deal changes
  useEffect(() => {
    if (deal && open) {
      setName(deal.name);
      setGroupName(deal.groupName || '');
      setAmountStr(deal.amount.toString());
      if (deal.toBranchId.startsWith('custom-')) {
        setTargetType('custom');
        setToBranchId('');
        setCustomEntity(deal.toBranchName);
      } else {
        setTargetType('branch');
        setToBranchId(deal.toBranchId);
        setCustomEntity('');
      }
      setStatus(deal.status);
      setManagerShareStr(deal.managerShare?.toString() ?? '20');
      setLeadName(deal.leadName || '');
      setLeadPhone(deal.leadPhone || '');
      setLeadEmail(deal.leadEmail || '');
      setLeadAddress(deal.leadAddress || '');
      setDealInvestors(
        deal.investors.map(inv => ({
          investorId: inv.investorId,
          percentageStr: deal.amount > 0 ? ((inv.amount / deal.amount) * 100).toFixed(2).replace(/\.00$/, '') : '0',
        }))
      );
      setError('');
    }
  }, [deal, open]);

  const dealAmount = Number(amountStr) || 0;

  const totalInvestment = useMemo(() => {
    const totalPercentage = dealInvestors.reduce((acc, inv) => acc + (Number(inv.percentageStr) || 0), 0);
    return (totalPercentage / 100) * dealAmount;
  }, [dealInvestors, dealAmount]);

  const balance = totalInvestment - dealAmount;

  const handleAddInvestorRow = () => {
    setDealInvestors([...dealInvestors, { investorId: '', percentageStr: '' }]);
  };

  const handleRemoveInvestorRow = (index: number) => {
    const newInvestors = [...dealInvestors];
    newInvestors.splice(index, 1);
    setDealInvestors(newInvestors);
  };

  const handleInvestorChange = (index: number, field: 'investorId' | 'percentageStr', value: string) => {
    const newInvestors = [...dealInvestors];
    newInvestors[index][field] = value;
    setDealInvestors(newInvestors);
  };

  const handleSubmit = () => {
    setError('');

    if (!name.trim()) return setError('Deal name is required.');
    if (dealAmount <= 0) return setError('Deal amount must be greater than zero.');

    const targetBranch = targetType === 'branch' ? branches.find(b => b.id === toBranchId) : null;
    if (targetType === 'branch' && !targetBranch) return setError('Selected branch not found.');
    if (targetType === 'custom' && !customEntity.trim()) return setError('Custom entity name is required.');

    const parsedManagerShare = Number(managerShareStr);
    if (isNaN(parsedManagerShare) || parsedManagerShare < 0 || parsedManagerShare > 100) {
      return setError('Manager share must be between 0 and 100.');
    }

    // Validate investors
    const validInvestors: DealInvestor[] = [];
    for (let i = 0; i < dealInvestors.length; i++) {
      const { investorId, percentageStr } = dealInvestors[i];
      if (!investorId) continue; // skip empty rows
      const invPercentage = Number(percentageStr);
      if (invPercentage <= 0 || invPercentage > 100) return setError(`Percentage for investor row ${i + 1} must be between 0 and 100.`);

      const invAmount = (invPercentage / 100) * dealAmount;

      const investor = investors.find(inv => inv.id === investorId);
      if (!investor) return setError(`Investor not found for row ${i + 1}.`);

      validInvestors.push({
        investorId,
        investorName: investor.name,
        amount: invAmount,
        isGold: false, // For simplicity in this UI, we treat as AED cash. Can be extended later.
      });
    }

    if (validInvestors.length === 0) return setError('At least one investor must be added.');

    // Ensure no duplicates
    const uniqueIds = new Set(validInvestors.map(v => v.investorId));
    if (uniqueIds.size !== validInvestors.length) return setError('Duplicate investors are not allowed.');

    // Removed original targetBranch check since it's handled above

    updateDeal({
      ...deal,
      name: name.trim(),
      groupName: groupName.trim() || 'General',
      amount: dealAmount,
      investors: validInvestors,
      totalInvestment,
      balance,
      toBranchId: targetType === 'branch' ? toBranchId : (deal.toBranchId.startsWith('custom-') ? deal.toBranchId : `custom-${Date.now()}`),
      toBranchName: targetType === 'branch' ? targetBranch!.name : customEntity.trim(),
      status,
      managerShare: parsedManagerShare,
      leadName: leadName.trim(),
      leadPhone: leadPhone.trim(),
      leadEmail: leadEmail.trim(),
      leadAddress: leadAddress.trim(),
    });

    setError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Group"
      footer={
        <>
          <button type="button" className={`${btnSecondary}`} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary}`} onClick={handleSubmit}>
            Save Changes
          </button>
        </>
      }
    >
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Group Name</label>
          <input
            className={formInput}
            type="text"
            placeholder="e.g. Q3 Syndicate"
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
          />
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Deal Name</label>
          <input
            className={formInput}
            type="text"
            placeholder="e.g. Real Estate Acquisition"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
      </div>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Deal Amount (AED)</label>
          <input
            className={formInput}
            type="number"
            placeholder="0.00"
            value={amountStr}
            onChange={e => setAmountStr(e.target.value)}
          />
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Manager Share (%)</label>
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
          <label className={formLabel}>Deal Status</label>
          <select className={formSelect} value={status} onChange={e => setStatus(e.target.value as DealStatus)}>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
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

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-800">Investors</h4>
          <button type="button" onClick={handleAddInvestorRow} className="text-xs font-semibold text-accent hover:text-accent-dark">
            + Add Investor
          </button>
        </div>

        <div className="space-y-3">
          {dealInvestors.map((inv, index) => (
            <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <div className="flex-1 min-w-0">
                <select
                  className={formSelect}
                  value={inv.investorId}
                  onChange={e => handleInvestorChange(index, 'investorId', e.target.value)}
                >
                  <option value="">Select Investor</option>
                  {investors.filter(i => i.status !== 'pending' || i.id === inv.investorId).map((i: Investor) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Bal: {formatAEDStr(i.cashDeposit)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <input
                    className={`${formInput} !pr-8`}
                    type="number"
                    placeholder="Share %"
                    value={inv.percentageStr}
                    onChange={e => handleInvestorChange(index, 'percentageStr', e.target.value)}
                    max="100"
                    min="0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                </div>
              </div>
              {dealInvestors.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveInvestorRow(index)}
                  className="mt-2 text-slate-400 hover:text-red-500 sm:mt-0 sm:self-center"
                  aria-label="Remove investor"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-1 border-t border-slate-200 pt-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-600">Total Investment:</span>
            <span className="font-bold text-slate-900">{formatAED(totalInvestment)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-medium text-slate-600">Balance (Investment - Deal Amount):</span>
            <span className={`font-bold ${balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : 'text-slate-900'}`}>
              {formatAED(balance)}
            </span>
          </div>
        </div>
      </div>

      {error ? <p className={`${formError} mb-4`}>{error}</p> : null}
    </Modal>
  );
}
