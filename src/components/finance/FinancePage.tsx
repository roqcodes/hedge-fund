'use client';
import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate } from '@/data/mockData';
import KPICard from '@/components/ui/KPICard';
import { Expense, ExpenseType, Branch } from '@/types';

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
      <div className="animate-in">
        <div className="page-header">
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Financial Operations</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Track capital and operating expenditures across branches</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)} id="btn-add-expense">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14m-7-7h14" /></svg>
            Record Expense
          </button>
        </div>

        <div className="kpi-grid-v2" style={{ marginBottom: 32 }}>
          <KPICard
            label="Total Expenditure"
            value={formatINR(totalExpenses)}
            subValue="Consolidated spending"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard
            label="Capital Expenditure"
            value={formatINR(totalCapex)}
            subValue="Long-term investments (CAPEX)"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
          <KPICard
            label="Operating Expenses"
            value={formatINR(totalOpex)}
            subValue="Day-to-day costs (OPEX)"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2zM7 21h10M12 18v3" /></svg>}
            color="var(--info)"
            bgColor="var(--info-light)"
          />
          <KPICard
            label="Burn Rate"
            value={formatINR(Math.round(totalOpex / 30))}
            subValue="Estimated daily average"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>}
            color="var(--loss)"
            bgColor="var(--loss-light)"
          />
        </div>

        <div className="tabs">
          <button className={`tab-btn ${tab === 'opex' ? 'active' : ''}`} onClick={() => setTab('opex')}>Operating (OPEX)</button>
          <button className={`tab-btn ${tab === 'capex' ? 'active' : ''}`} onClick={() => setTab('capex')}>Capital (CAPEX)</button>
        </div>

        <div className="card animate-in">
          <div className="card-header">
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>{tab === 'capex' ? 'Capital' : 'Operating'} Expense Ledger</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Branch</th><th>Category</th><th>Description</th><th>Amount</th><th>Type</th></tr></thead>
                <tbody>
                  {filtered.map((e: Expense) => (
                    <tr key={e.id}>
                      <td style={{ fontSize: 12 }}>{formatDate(e.date)}</td>
                      <td style={{ fontWeight: 700 }}>{e.branchName}</td>
                      <td style={{ fontWeight: 500 }}>{e.category}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{e.description}</td>
                      <td className="amount loss" style={{ fontWeight: 700 }}>{formatINR(e.amount)}</td>
                      <td><span className={`badge badge-${e.type}`}>{e.type.toUpperCase()}</span></td>
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

function AddExpenseModal({ open, onClose, branches, addExpense }: { open: boolean; onClose: () => void; branches: Branch[]; addExpense: (e: any) => void }) {
  const [branchId, setBranchId] = useState('');
  const [type, setType] = useState<ExpenseType>('opex');
  const [category, setCategory] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = () => {
    if (!branchId || !category || !desc || !amount) return;
    const branch = branches.find((b: Branch) => b.id === branchId);
    addExpense({ date: new Date().toISOString().split('T')[0], branchId, branchName: branch?.name || '', type, category, description: desc, amount: Number(amount) });
    setBranchId(''); setCategory(''); setDesc(''); setAmount('');
    onClose();
  };

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Record New Expenditure</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">Branch</label>
              <select className="form-select" value={branchId} onChange={e => setBranchId(e.target.value)}>
                <option value="">Select branch</option>
                {branches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Expense Class</label>
              <select className="form-select" value={type} onChange={e => setType(e.target.value as ExpenseType)}>
                <option value="opex">Operating (OPEX)</option>
                <option value="capex">Capital (CAPEX)</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <input className="form-input" placeholder={type === 'capex' ? "e.g. Infrastructure, Servers, Vehicles" : "e.g. Salaries, Utilities, Rent"} value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <div className="form-group"><label className="form-label">Description</label><input className="form-input" placeholder="What was the purpose of this spend?" value={desc} onChange={e => setDesc(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Amount (₹)</label><input className="form-input" type="number" placeholder="Enter transaction value" value={amount} onChange={e => setAmount(e.target.value)} /></div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>Commit Expense</button></div>
      </div>
    </div>
  );
}
