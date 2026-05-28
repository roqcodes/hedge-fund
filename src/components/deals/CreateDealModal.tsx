'use client';
import React, { useState, useMemo, useEffect } from 'react';
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

  const [groupName, setGroupName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [targetType, setTargetType] = useState<'branch' | 'custom'>('branch');
  const [customEntity, setCustomEntity] = useState('');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadAddress, setLeadAddress] = useState('');
  const [dealInvestors, setDealInvestors] = useState<{ investorId: string; percentageStr: string; amountStr: string; inputMode: 'percentage' | 'amount' }[]>([
    { investorId: '', percentageStr: '', amountStr: '', inputMode: 'percentage' },
  ]);
  const [error, setError] = useState('');
  const [date, setDate] = useState(() => {
    const d = new Date();
    const tzoffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
  });

  const dealAmount = Number(amountStr) || 0;

  // Calculate total investment
  const totalInvestment = useMemo(() => {
    return dealInvestors.reduce((acc, inv) => {
      if (inv.inputMode === 'amount') {
        return acc + (Number(inv.amountStr) || 0);
      }
      return acc + ((Number(inv.percentageStr) || 0) / 100) * dealAmount;
    }, 0);
  }, [dealInvestors, dealAmount]);

  const balance = totalInvestment - dealAmount;

  const handleAddInvestorRow = () => {
    setDealInvestors([...dealInvestors, { investorId: '', percentageStr: '', amountStr: '', inputMode: 'percentage' }]);
  };

  const handleRemoveInvestorRow = (index: number) => {
    const newInvestors = [...dealInvestors];
    newInvestors.splice(index, 1);
    setDealInvestors(newInvestors);
  };

  const handleInvestorChange = (index: number, field: 'investorId' | 'percentageStr' | 'amountStr', value: string) => {
    const newInvestors = [...dealInvestors];
    const inv = newInvestors[index];
    inv[field] = value;
    
    setDealInvestors(newInvestors);
  };

  const toggleInputMode = (index: number) => {
    const newInvestors = [...dealInvestors];
    const inv = newInvestors[index];
    if (inv.inputMode === 'percentage') {
      // Convert percentage to amount
      const pct = Number(inv.percentageStr) || 0;
      inv.amountStr = dealAmount > 0 ? ((pct / 100) * dealAmount).toFixed(2).replace(/\.00$/, '') : '';
      inv.inputMode = 'amount';
    } else {
      // Convert amount to percentage
      const amt = Number(inv.amountStr) || 0;
      inv.percentageStr = dealAmount > 0 ? ((amt / dealAmount) * 100).toFixed(2).replace(/\.00$/, '') : '';
      inv.inputMode = 'percentage';
    }
    setDealInvestors(newInvestors);
  };

  const handleSubmit = () => {
    setError('');

    if (!groupName.trim()) return setError('Group name is required.');
    if (dealAmount <= 0) return setError('Group capital must be greater than zero.');
    if (!date) return setError('Creation date is required.');

    // Validate investors
    const validInvestors: DealInvestor[] = [];
    for (let i = 0; i < dealInvestors.length; i++) {
      const { investorId, percentageStr, amountStr: invAmountStr, inputMode } = dealInvestors[i];
      if (!investorId) continue; // skip empty rows

      let invAmount: number;
      if (inputMode === 'amount') {
        invAmount = Number(invAmountStr) || 0;
        if (invAmount <= 0) return setError(`Amount for investor row ${i + 1} must be greater than zero.`);
      } else {
        const invPercentage = Number(percentageStr);
        if (invPercentage <= 0 || invPercentage > 100) return setError(`Percentage for investor row ${i + 1} must be between 0 and 100.`);
        invAmount = (invPercentage / 100) * dealAmount;
      }

      const investor = investors.find(inv => inv.id === investorId);
      if (!investor) return setError(`Investor not found for row ${i + 1}.`);

      validInvestors.push({
        investorId,
        investorName: investor.name,
        amount: invAmount,
        isGold: false,
      });
    }

    if (validInvestors.length === 0) return setError('At least one investor must be added.');

    // Ensure no duplicates
    const uniqueIds = new Set(validInvestors.map(v => v.investorId));
    if (uniqueIds.size !== validInvestors.length) return setError('Duplicate investors are not allowed.');

    addDeal({
      name: groupName.trim(), // Use groupName as the deal name
      groupName: groupName.trim(),
      amount: dealAmount,
      investors: validInvestors,
      totalInvestment,
      balance,
      toBranchId: `custom-${Date.now()}`,
      toBranchName: 'Unassigned',
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
    });

    // Reset and close
    setGroupName('');
    setAmountStr('');
    setToBranchId('');
    setTargetType('branch');
    setCustomEntity('');
    setLeadName('');
    setLeadPhone('');
    setLeadEmail('');
    setLeadAddress('');
    setDealInvestors([{ investorId: '', percentageStr: '', amountStr: '', inputMode: 'percentage' }]);
    const d = new Date();
    const tzoffset = d.getTimezoneOffset() * 60000;
    setDate(new Date(d.getTime() - tzoffset).toISOString().slice(0, 16));
    setError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Group"
      footer={
        <>
          <button type="button" className={`${btnSecondary}`} onClick={onClose}>
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
            <div key={index} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <select
                    className={formSelect}
                    value={inv.investorId}
                    onChange={e => handleInvestorChange(index, 'investorId', e.target.value)}
                  >
                    <option value="">Select Investor</option>
                    {investors.filter(i => i.status !== 'pending').map((i: Investor) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                {dealInvestors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveInvestorRow(index)}
                    className="shrink-0 flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    aria-label="Remove investor"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {/* Segmented Toggle */}
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => { if (inv.inputMode !== 'percentage') toggleInputMode(index); }}
                    className={`rounded-md px-3 py-1 text-[11px] font-bold transition-all duration-200 ${
                      inv.inputMode === 'percentage'
                        ? 'bg-white text-accent shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    % Share
                  </button>
                  <button
                    type="button"
                    onClick={() => { if (inv.inputMode !== 'amount') toggleInputMode(index); }}
                    className={`rounded-md px-3 py-1 text-[11px] font-bold transition-all duration-200 ${
                      inv.inputMode === 'amount'
                        ? 'bg-white text-accent shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Amount
                  </button>
                </div>
                {/* Share/Amount Input */}
                <div className="flex-1 min-w-0">
                  <div className="relative">
                    {inv.inputMode === 'percentage' ? (
                      <>
                        <input
                          className={`${formInput} !pr-8`}
                          type="number"
                          placeholder="Enter share %"
                          value={inv.percentageStr}
                          onChange={e => handleInvestorChange(index, 'percentageStr', e.target.value)}
                          max="100"
                          min="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">%</span>
                      </>
                    ) : (
                      <>
                        <input
                          className={`${formInput} !pr-12`}
                          type="number"
                          placeholder="Enter amount"
                          value={inv.amountStr}
                          onChange={e => handleInvestorChange(index, 'amountStr', e.target.value)}
                          min="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400">AED</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
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
