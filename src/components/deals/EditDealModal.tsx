'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatAED } from '@/data/mockData';
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
  const [amountStr, setAmountStr] = useState('');
  const [toBranchId, setToBranchId] = useState('');
  const [status, setStatus] = useState<DealStatus>('active');
  const [dealInvestors, setDealInvestors] = useState<{ investorId: string; amountStr: string }[]>([]);
  const [error, setError] = useState('');

  // Synchronize state when the modal opens or the deal changes
  useEffect(() => {
    if (deal) {
      setName(deal.name);
      setAmountStr(deal.amount.toString());
      setToBranchId(deal.toBranchId);
      setStatus(deal.status);
      setDealInvestors(
        deal.investors.map(inv => ({
          investorId: inv.investorId,
          amountStr: inv.amount.toString(),
        }))
      );
      setError('');
    }
  }, [deal, open]);

  const dealAmount = Number(amountStr) || 0;

  // Calculate total investment
  const totalInvestment = useMemo(() => {
    return dealInvestors.reduce((acc, inv) => acc + (Number(inv.amountStr) || 0), 0);
  }, [dealInvestors]);

  const balance = totalInvestment - dealAmount;

  const handleAddInvestorRow = () => {
    setDealInvestors([...dealInvestors, { investorId: '', amountStr: '' }]);
  };

  const handleRemoveInvestorRow = (index: number) => {
    const newInvestors = [...dealInvestors];
    newInvestors.splice(index, 1);
    setDealInvestors(newInvestors);
  };

  const handleInvestorChange = (index: number, field: 'investorId' | 'amountStr', value: string) => {
    const newInvestors = [...dealInvestors];
    newInvestors[index][field] = value;
    setDealInvestors(newInvestors);
  };

  const handleSubmit = () => {
    setError('');

    if (!name.trim()) return setError('Deal name is required.');
    if (dealAmount <= 0) return setError('Deal amount must be greater than zero.');
    if (!toBranchId) return setError('Target branch is required.');

    // Validate investors
    const validInvestors: DealInvestor[] = [];
    for (let i = 0; i < dealInvestors.length; i++) {
      const { investorId, amountStr } = dealInvestors[i];
      if (!investorId) continue; // skip empty rows
      const invAmount = Number(amountStr);
      if (invAmount <= 0) return setError(`Amount for investor row ${i + 1} must be > 0.`);

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

    const targetBranch = branches.find(b => b.id === toBranchId);
    if (!targetBranch) return setError('Selected branch not found.');

    updateDeal({
      ...deal,
      name: name.trim(),
      amount: dealAmount,
      investors: validInvestors,
      totalInvestment,
      balance,
      toBranchId,
      toBranchName: targetBranch.name,
      status,
    });

    setError('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Deal"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSubmit}>
            Save Changes
          </button>
        </>
      }
    >
      <div className={formRow}>
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
      </div>

      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>To Branch</label>
          <select className={formSelect} value={toBranchId} onChange={e => setToBranchId(e.target.value)}>
            <option value="">Select branch to allocate funds</option>
            {branches.filter((b: Branch) => b.status === 'active').map((b: Branch) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <p className={formHint}>The branch that will manage this deal's capital.</p>
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Deal Status</label>
          <select className={formSelect} value={status} onChange={e => setStatus(e.target.value as DealStatus)}>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
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
                      {i.name} (Bal: {formatAED(i.cashDeposit)})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-0">
                <input
                  className={formInput}
                  type="number"
                  placeholder="Invested Amount"
                  value={inv.amountStr}
                  onChange={e => handleInvestorChange(index, 'amountStr', e.target.value)}
                />
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
