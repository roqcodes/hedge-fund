'use client';
import React, { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDateTime } from '@/data/mockData';
import { Branch, Transaction, TransactionType } from '@/types';

export default function FundManagement() {
  const { branches, transactions, transferFunds, hqBalance } = useApp();
  const [showTransfer, setShowTransfer] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [branchFilter, setBranchFilter] = useState<string>('all');

  // Transaction Stats
  const totalVolume = transactions.reduce((acc: number, t: Transaction) => acc + t.amount, 0);
  const transferCount = transactions.filter((t: Transaction) => t.type === 'transfer').length;
  const pendingCount = transactions.filter((t: Transaction) => t.status === 'pending').length;
  const allocationVolume = transactions.filter((t: Transaction) => t.type === 'allocation').reduce((acc: number, t: Transaction) => acc + t.amount, 0);

  const filteredTxns = transactions.filter((t: Transaction) => {
    if (filter !== 'all' && t.type !== filter) return false;
    if (branchFilter !== 'all' && t.from !== branchFilter && t.to !== branchFilter) return false;
    return true;
  });

  const typeFilters: { value: string; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'expense', label: 'Expense' },
    { value: 'profit', label: 'Profit' },
    { value: 'allocation', label: 'Allocation' },
  ];

  return (
    <>
      <div className="animate-in">
        <div className="page-header">
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Fund Management</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Monitor capital flow and execute strategic transfers</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowTransfer(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            Execute Transfer
          </button>
        </div>

        <div className="kpi-grid-v2" style={{ marginBottom: 32 }}>
          <KPICard 
            label="HQ Treasury Balance" 
            value={formatINR(hqBalance)} 
            subValue="Available for allocation"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z"/></svg>}
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard 
            label="Total Fund Volume" 
            value={formatINR(totalVolume)} 
            subValue="Total transaction throughput"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
            color="var(--info)"
            bgColor="var(--info-light)"
          />
          <KPICard 
            label="Inter-branch Transfers" 
            value={transferCount} 
            subValue="Internal liquidity moves"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>}
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
          <KPICard 
            label="Pending Approvals" 
            value={pendingCount} 
            subValue="Awaiting verification"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
            color="var(--action)"
            bgColor="var(--action-light)"
          />
        </div>

        <div className="card animate-in">
          <div className="card-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Transaction History</h3>
              <div className="filters-bar" style={{ margin: 0, padding: 0, background: 'none', border: 'none', boxShadow: 'none' }}>
                <select className="form-select" style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }} value={filter} onChange={e => setFilter(e.target.value)}>
                  {typeFilters.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <select className="form-select" style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }} value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                  <option value="all">All Branches</option>
                  {branches.map((b: Branch) => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
            </div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr><th>Date & Time</th><th>From</th><th>To</th><th>Amount</th><th>Type</th><th>Status</th><th>Notes</th></tr></thead>
                <tbody>
                  {filteredTxns.map((t: Transaction) => (
                    <tr key={t.id}>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDateTime(t.date)}</td>
                      <td style={{ fontWeight: 600 }}>{t.from}</td>
                      <td style={{ fontWeight: 600 }}>{t.to}</td>
                      <td className="amount" style={{ fontWeight: 700 }}>{formatINR(t.amount)}</td>
                      <td><span className={`badge badge-${t.type}`}>{t.type.toUpperCase()}</span></td>
                      <td><span className={`badge badge-${t.status}`}>{t.status.toUpperCase()}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <TransferFundsModal 
        open={showTransfer} 
        onClose={() => setShowTransfer(false)} 
        branches={branches} 
        hqBalance={hqBalance}
        transferFunds={transferFunds}
      />
    </>
  );
}

function TransferFundsModal({ open, onClose, branches, hqBalance, transferFunds }: { open: boolean; onClose: () => void; branches: Branch[]; hqBalance: number; transferFunds: any }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const fromBranch = branches.find((b: Branch) => b.id === from);
  const isHqTransfer = from === 'HQ_TREASURY';
  const availableBalance = isHqTransfer ? hqBalance : fromBranch?.currentBalance || 0;

  const handleSubmit = () => {
    setError('');
    if (!from || !to || !amount) { setError('All fields are required'); return; }
    if (from === to) { setError('Cannot transfer to the same branch'); return; }
    const amt = Number(amount);
    if (amt > availableBalance) { setError(`Insufficient balance. Available: ${formatINR(availableBalance)}`); return; }
    if (amt <= 0) { setError('Amount must be greater than zero'); return; }
    
    transferFunds(from, to, amt, notes);
    setFrom(''); setTo(''); setAmount(''); setNotes(''); setError('');
    onClose();
  };

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Execute Capital Movement</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Source Account</label>
              <select className="form-select" value={from} onChange={e => setFrom(e.target.value)}>
                <option value="">Select source</option>
                <optgroup label="Central Treasury">
                  <option value="HQ_TREASURY">HQ Treasury — {formatINR(hqBalance)}</option>
                </optgroup>
                <optgroup label="Branch Balances">
                  {branches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </optgroup>
              </select>
              {from && <div className="form-hint">Available: {formatINR(availableBalance)}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Recipient Branch</label>
              <select className="form-select" value={to} onChange={e => setTo(e.target.value)}>
                <option value="">Select destination</option>
                {branches.filter((b: Branch) => b.id !== from).map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Amount (₹)</label>
            <input className="form-input" type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Reference Notes</label>
            <textarea className="form-textarea" placeholder="Describe the purpose of this transfer..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          </div>
          {error && <div className="form-error" style={{ marginBottom: 16 }}>{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}>Confirm Transfer</button>
        </div>
      </div>
    </div>
  );
}
