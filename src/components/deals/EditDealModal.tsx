'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  const { branches, investors, updateDeal, deleteDeal } = useApp();
  const router = useRouter();

  const [groupName, setGroupName] = useState('');

  const [amountStr, setAmountStr] = useState('');
  const [managerShareStr, setManagerShareStr] = useState('20');
  const [status, setStatus] = useState<DealStatus>('active');
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [leadAddress, setLeadAddress] = useState('');
  const [dealInvestors, setDealInvestors] = useState<{ investorId: string; percentageStr: string; amountStr: string; inputMode: 'percentage' | 'amount' }[]>([]);
  const [error, setError] = useState('');
  const [date, setDate] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Synchronize state when the modal opens or the deal changes
  useEffect(() => {
    if (deal && open) {
      setGroupName(deal.groupName || '');
      

      setAmountStr(deal.amount.toString());
      setAmountStr(deal.amount.toString());
      setStatus(deal.status);
      setManagerShareStr(deal.managerShare?.toString() ?? '20');
      setLeadName(deal.leadName || '');
      setLeadPhone(deal.leadPhone || '');
      setLeadEmail(deal.leadEmail || '');
      setLeadAddress(deal.leadAddress || '');
      
      if (deal.investors && deal.investors.length > 0) {
        setDealInvestors(deal.investors.map(inv => ({
          investorId: inv.investorId,
          percentageStr: deal.amount > 0 ? ((inv.amount / deal.amount) * 100).toFixed(2).replace(/\.00$/, '') : '',
          amountStr: inv.amount.toString(),
          inputMode: 'percentage' as const,
        })));
      } else {
        setDealInvestors([{ investorId: '', percentageStr: '', amountStr: '', inputMode: 'percentage' }]);
      }
      
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
    }
  }, [deal, open]);

  const parseSafeNumber = (val: string | number) => {
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const parsed = parseFloat(val.replace(/,/g, ''));
    return isNaN(parsed) ? 0 : parsed;
  };

  const dealAmount = parseSafeNumber(amountStr);

  const totalInvestment = useMemo(() => {
    return dealInvestors.reduce((acc, inv) => {
      if (inv.inputMode === 'amount') {
        return acc + parseSafeNumber(inv.amountStr);
      }
      return acc + (parseSafeNumber(inv.percentageStr) / 100) * dealAmount;
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
      const pct = parseSafeNumber(inv.percentageStr);
      inv.amountStr = dealAmount > 0 ? ((pct / 100) * dealAmount).toFixed(2).replace(/\.00$/, '') : '';
      inv.inputMode = 'amount';
    } else {
      const amt = parseSafeNumber(inv.amountStr);
      inv.percentageStr = dealAmount > 0 ? ((amt / dealAmount) * 100).toFixed(2).replace(/\.00$/, '') : '';
      inv.inputMode = 'percentage';
    }
    setDealInvestors(newInvestors);
  };

  const isDirty = useMemo(() => {
    if (!deal) return false;
    
    if (groupName !== (deal.groupName || '')) return true;
    if (amountStr !== deal.amount.toString()) return true;
    if (status !== deal.status) return true;
    if (managerShareStr !== (deal.managerShare?.toString() ?? '20')) return true;
    if (leadName !== (deal.leadName || '')) return true;
    if (leadPhone !== (deal.leadPhone || '')) return true;
    if (leadEmail !== (deal.leadEmail || '')) return true;
    if (leadAddress !== (deal.leadAddress || '')) return true;

    if (deal.investors) {
      if (dealInvestors.length !== deal.investors.length) return true;
      for (let i = 0; i < dealInvestors.length; i++) {
        if (dealInvestors[i].investorId !== deal.investors[i].investorId) return true;
        if (parseSafeNumber(dealInvestors[i].amountStr) !== deal.investors[i].amount) return true;
      }
    } else if (dealInvestors.length > 0 && dealInvestors[0].investorId !== '') {
      return true;
    }

    return false;
  }, [deal, groupName, amountStr, status, managerShareStr, leadName, leadPhone, leadEmail, leadAddress, dealInvestors]);

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

    // Validate investors
    const validInvestors: DealInvestor[] = [];
    let sumPercentage = 0;

    for (let i = 0; i < dealInvestors.length; i++) {
      const { investorId, percentageStr, amountStr: invAmountStr, inputMode } = dealInvestors[i];
      if (!investorId) continue; // skip empty rows

      let invAmount: number;
      if (inputMode === 'amount') {
        invAmount = parseSafeNumber(invAmountStr);
        if (invAmount <= 0) return setError(`Amount for investor row ${i + 1} must be greater than zero.`);
        sumPercentage += (invAmount / dealAmount) * 100;
      } else {
        const invPercentage = parseSafeNumber(percentageStr);
        if (invPercentage <= 0 || invPercentage > 100) return setError(`Percentage for investor row ${i + 1} must be between 0 and 100.`);
        invAmount = (invPercentage / 100) * dealAmount;
        sumPercentage += invPercentage;
      }

      const investor = investors.find(inv => inv.id === investorId);
      if (!investor) return setError(`Investor not found for row ${i + 1}.`);

      validInvestors.push({
        investorId,
        investorName: investor.name,
        amount: invAmount,
        isGold: false,
        goldVolume: 0,
      });
    }

    if (validInvestors.length === 0) return setError('At least one investor must be added.');

    // Ensure sum matches 100% exactly (with a small floating point tolerance)
    if (Math.abs(sumPercentage - 100) > 0.01) {
      return setError(`Total investor share must equal exactly 100%. Currently it is ${sumPercentage.toFixed(2)}%.`);
    }

    // Ensure no duplicates
    const uniqueIds = new Set(validInvestors.map(v => v.investorId));
    if (uniqueIds.size !== validInvestors.length) return setError('Duplicate investors are not allowed.');

    if (!date) return setError('Creation date is required.');

    updateDeal({
      ...deal,
      name: groupName.trim() || 'General',
      groupName: groupName.trim() || 'General',
      amount: dealAmount,
      goldVolume: 0,
      investors: validInvestors,
      totalInvestment: dealAmount,
      balance: 0,
      toBranchId: undefined,
      toBranchName: undefined,
      status,
      managerShare: parsedManagerShare,
      leadName: leadName.trim(),
      leadPhone: leadPhone.trim(),
      leadEmail: leadEmail.trim(),
      leadAddress: leadAddress.trim(),
      date: new Date(date).toISOString(),
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
      router.push('/group');
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
                    {investors.filter(i => i.status !== 'pending' || i.id === inv.investorId).map((i: Investor) => (
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
