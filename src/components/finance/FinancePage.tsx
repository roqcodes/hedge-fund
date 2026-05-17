'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatAED, formatDate } from '@/data/mockData';
import KPICard from '@/components/ui/KPICard';
import Modal from '@/components/ui/Modal';
import { Expense, ExpenseType, Branch } from '@/types';
import { badgeClass } from '@/lib/badgeClass';
import {
  btnPrimary,
  btnSecondary,
  formGroup,
  formInput,
  formLabel,
  formRow,
  formSelect,
  kpiGrid,
  pageHeader,
  pageSubtitle,
  pageTitle,
  tabBtn,
  tabBtnActive,
  tabsBar,
  tableWrap,
  dataTable,
} from '@/lib/ui';

export default function FinancePage() {
  const { expenses, branches, addExpense } = useApp();
  const [tab, setTab] = useState<ExpenseType>('opex');
  const [showAdd, setShowAdd] = useState(false);

  const filtered = expenses.filter((e: Expense) => e.type === tab);
  const totalCapex = expenses.filter((e: Expense) => e.type === 'capex').reduce((s: number, e: Expense) => s + e.amount, 0);
  const totalOpex = expenses.filter((e: Expense) => e.type === 'opex').reduce((s: number, e: Expense) => s + e.amount, 0);
  const totalExpenses = totalCapex + totalOpex;

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className={pageHeader}>
          <div>
            <h2 className={pageTitle}>Financial Operations</h2>
            <p className={pageSubtitle}>Track capital and operating expenditures across branches</p>
          </div>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => setShowAdd(true)} id="btn-add-expense">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Record Expense
          </button>
        </div>

        <div className={kpiGrid}>
          <KPICard
            label="Total Expenditure"
            value={formatAED(totalExpenses)}
            subValue="Consolidated spending"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard
            label="Capital Expenditure"
            value={formatAED(totalCapex)}
            subValue="Long-term investments (CAPEX)"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
          <KPICard
            label="Operating Expenses"
            value={formatAED(totalOpex)}
            subValue="Day-to-day costs (OPEX)"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21 16V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2zM7 21h10M12 18v3" />
              </svg>
            }
            color="var(--info)"
            bgColor="var(--info-light)"
          />
          <KPICard
            label="Burn Rate"
            value={formatAED(Math.round(totalOpex / 30))}
            subValue="Estimated daily average"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            }
            color="var(--loss)"
            bgColor="var(--loss-light)"
          />
        </div>

        <div className={tabsBar}>
          <button type="button" className={tab === 'opex' ? tabBtnActive : tabBtn} onClick={() => setTab('opex')}>
            Operating (OPEX)
          </button>
          <button type="button" className={tab === 'capex' ? tabBtnActive : tabBtn} onClick={() => setTab('capex')}>
            Capital (CAPEX)
          </button>
        </div>

        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-surface transition-[box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:shadow-surface-hover">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6">
            <h3 className="text-base font-bold text-slate-900 sm:text-lg">{tab === 'capex' ? 'Capital' : 'Operating'} Expense Ledger</h3>
          </div>
          <div className="p-0 sm:p-0">
            <div className={tableWrap}>
              <table className={dataTable}>
                <thead>
                  <tr>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Date</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Branch</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Category</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Description</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Amount</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e: Expense) => (
                    <tr key={e.id} data-interactive-row>
                      <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-xs first:rounded-l-2xl sm:px-5 sm:py-4 sm:text-sm">
                        {formatDate(e.date)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-bold sm:px-5 sm:py-4">{e.branchName}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-medium sm:px-5 sm:py-4">{e.category}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-[13px] text-slate-500 sm:px-5 sm:py-4">{e.description}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold text-red-600 sm:px-5 sm:py-4 sm:text-base">
                        {formatAED(e.amount)}
                      </td>
                      <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 last:rounded-r-2xl sm:px-5 sm:py-4">
                        <span className={badgeClass(e.type)}>{e.type.toUpperCase()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <AddExpenseModal open={showAdd} onClose={() => setShowAdd(false)} branches={branches} addExpense={addExpense} />
    </>
  );
}

function AddExpenseModal({
  open,
  onClose,
  branches,
  addExpense,
}: {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
  addExpense: (e: Omit<Expense, 'id'>) => void;
}) {
  const [branchId, setBranchId] = useState('');
  const [type, setType] = useState<ExpenseType>('opex');
  const [category, setCategory] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = () => {
    if (!branchId || !category || !desc || !amount) return;

    let branchName = '';
    if (branchId === 'HQ_TREASURY') {
      branchName = 'HQ Treasury';
    } else {
      const branch = branches.find((b: Branch) => b.id === branchId);
      branchName = branch?.name || '';
    }

    addExpense({
      date: new Date().toISOString().split('T')[0],
      branchId,
      branchName,
      type,
      category,
      description: desc,
      amount: Number(amount),
    });

    setBranchId('');
    setCategory('');
    setDesc('');
    setAmount('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record New Expenditure"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSubmit}>
            Commit Expense
          </button>
        </>
      }
    >
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Spending Entity</label>
          <select className={formSelect} value={branchId} onChange={e => setBranchId(e.target.value)}>
            <option value="">Select entity</option>
            <optgroup label="Central Treasury">
              <option value="HQ_TREASURY">HQ Treasury (Corporate)</option>
            </optgroup>
            <optgroup label="Branch Network">
              {branches.map((b: Branch) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Expense Class</label>
          <select className={formSelect} value={type} onChange={e => setType(e.target.value as ExpenseType)}>
            <option value="opex">Operating (OPEX)</option>
            <option value="capex">Capital (CAPEX)</option>
          </select>
        </div>
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Category</label>
        <input
          className={formInput}
          placeholder={type === 'capex' ? 'e.g. Infrastructure, Servers, Vehicles' : 'e.g. Salaries, Utilities, Rent'}
          value={category}
          onChange={e => setCategory(e.target.value)}
        />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Description</label>
        <input className={formInput} placeholder="What was the purpose of this spend?" value={desc} onChange={e => setDesc(e.target.value)} />
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Amount (AED)</label>
        <input className={formInput} type="number" placeholder="Enter transaction value" value={amount} onChange={e => setAmount(e.target.value)} />
      </div>
    </Modal>
  );
}
