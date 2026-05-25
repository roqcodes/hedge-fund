'use client';
import React, { useState, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatAED, formatAEDStr } from '@/data/mockData';
import { Branch, Investor, DealInvestor } from '@/types';
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
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { branches, investors, addDeal } = useApp();

  const [name, setName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [targetType, setTargetType] = useState<'branch' | 'custom'>('branch');
  const [customEntity, setCustomEntity] = useState('');
  const [managerShareStr, setManagerShareStr] = useState('20');
  const [dealInvestors, setDealInvestors] = useState<{ investorId: string; percentageStr: string }[]>([
    { investorId: '', percentageStr: '' },
  ]);
  const [error, setError] = useState('');

  const dealAmount = Number(amountStr) || 0;

  // Calculate total investment
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

    addDeal({
      name: name.trim(),
      groupName: groupName.trim() || 'General',
      amount: dealAmount,
      investors: validInvestors,
      totalInvestment,
      balance,
      toBranchId: `custom-${Date.now()}`,
      toBranchName: 'Unassigned',
      status: 'active',
      totalPL: 0,
      expense: 0,
      managerShare: parsedManagerShare,
    });

    // Reset and close
    setName('');
    setGroupName('');
    setAmountStr('');
    setToBranchId('');
    setTargetType('branch');
    setCustomEntity('');
    setManagerShareStr('20');
    setDealInvestors([{ investorId: '', percentageStr: '' }]);
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
            Edit Group
          </button>
        </>
      }
    >
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Group Name</label>
          <input className={formInput} type="text" placeholder="e.g. Q3 Syndicate" value={groupName} onChange={e => setGroupName(e.target.value)} />
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Deal Name</label>
          <input className={formInput} type="text" placeholder="e.g. Real Estate Acquisition" value={name} onChange={e => setName(e.target.value)} />
        </div>
      </div>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Deal Amount (AED)</label>
          <input className={formInput} type="number" placeholder="0.00" value={amountStr} onChange={e => setAmountStr(e.target.value)} />
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
                  {investors.filter(i => i.status !== 'pending').map((i: Investor) => (
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
