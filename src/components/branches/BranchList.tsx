'use client';
import React, { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDateTime } from '@/data/mockData';
import { Branch, Transaction } from '@/types';

export default function BranchList() {
  const { branches, selectBranch, selectedBranchId, transactions } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  // Global branch stats
  const totalBalance = branches.reduce((acc: number, b: Branch) => acc + b.currentBalance, 0);
  const totalPL = branches.reduce((acc: number, b: Branch) => acc + b.dailyPL, 0);
  const activeCount = branches.filter((b: Branch) => b.status === 'active').length;
  const avgEfficiency = 94.2; // Mock value

  if (selectedBranchId) {
    const b = branches.find((br: Branch) => br.id === selectedBranchId);
    if (!b) return null;
    const branchTxns = transactions.filter((t: Transaction) => t.from === b.name || t.to === b.name).slice(0, 8);
    return (
      <>
        <div className="animate-in">
        <div className="branch-detail-header">
          <button className="back-btn" onClick={() => selectBranch(null)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5m0 0l7-7m-7 7l7 7"/></svg>
            Back to Branches
          </button>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px' }}>{b.name}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{b.location} · Managed by {b.managerName}</p>
          </div>
        </div>

        <div className="kpi-grid-v2" style={{ marginBottom: 32 }}>
          <KPICard 
            label="Opening Balance" 
            value={formatINR(b.openingBalance)} 
            subValue="Initial capital"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z"/></svg>}
            color="var(--info)"
            bgColor="var(--info-light)"
          />
          <KPICard 
            label="Daily P&L" 
            value={`${b.dailyPL >= 0 ? '+' : ''}${formatINR(b.dailyPL)}`}
            trend={{ value: `${((b.dailyPL / b.openingBalance) * 100).toFixed(1)}%`, isUp: b.dailyPL >= 0 }}
            subValue="Today's performance"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18m22-12h-6m6 0v6"/></svg>}
            color={b.dailyPL >= 0 ? 'var(--profit)' : 'var(--loss)'}
            bgColor={b.dailyPL >= 0 ? 'var(--profit-light)' : 'var(--loss-light)'}
          />
          <KPICard 
            label="Current Balance" 
            value={formatINR(b.currentBalance)} 
            subValue="Total liquid capital"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard 
            label="End Day projection" 
            value={formatINR(b.closingBalance)} 
            subValue="Est. final balance"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h7m9-7l-3 3-1-1m4-5v3m-4-3l-4 4"/></svg>}
            color="var(--purple)"
            bgColor="var(--purple-light)"
          />
        </div>

        <div className="card">
          <div className="card-header"><h3>Recent Transactions</h3></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead><tr><th>Date</th><th>From</th><th>To</th><th>Amount</th><th>Type</th></tr></thead>
                <tbody>
                  {branchTxns.map((t: Transaction) => (
                    <tr key={t.id}>
                      <td style={{ fontSize: 12 }}>{formatDateTime(t.date)}</td>
                      <td>{t.from}</td><td>{t.to}</td>
                      <td className="amount" style={{ fontWeight: 700 }}>{formatINR(t.amount)}</td>
                      <td><span className={`badge badge-${t.type}`}>{t.type}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="animate-in">
      <div className="page-header">
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Branch Management</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{branches.length} branches registered across India</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setShowTransfer(true)} id="btn-transfer-branch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
            Transfer Funds
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} id="btn-create-branch">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
            Create Branch
          </button>
        </div>
      </div>

      <div className="kpi-grid-v2" style={{ marginBottom: 32 }}>
        <KPICard 
          label="Total Network Capital" 
          value={formatINR(totalBalance)} 
          subValue="Consolidated balance"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
          color="var(--accent)"
          bgColor="var(--accent-light)"
        />
        <KPICard 
          label="Combined P&L" 
          value={`${totalPL >= 0 ? '+' : ''}${formatINR(totalPL)}`}
          trend={{ value: '12.4%', isUp: totalPL >= 0 }}
          subValue="All branches performance"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 6l-9.5 9.5-5-5L1 18m22-12h-6m6 0v6"/></svg>}
          color={totalPL >= 0 ? 'var(--profit)' : 'var(--loss)'}
          bgColor={totalPL >= 0 ? 'var(--profit-light)' : 'var(--loss-light)'}
        />
        <KPICard 
          label="Active Branches" 
          value={activeCount} 
          subValue="Operating units"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M5 21V10m14 11V10M2 7l10-5 10 5M10 14h4v7h-4z"/></svg>}
          color="var(--info)"
          bgColor="var(--info-light)"
        />
        <KPICard 
          label="Network Efficiency" 
          value={`${avgEfficiency}%`} 
          subValue="Operating at scale"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>}
          color="var(--purple)"
          bgColor="var(--purple-light)"
        />
      </div>

      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>Branch Directory</h3>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{branches.length} TOTAL</span>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Branch</th><th>Location</th><th>Manager</th><th>Balance</th><th>Last Activity</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {branches.map((b: Branch) => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{b.name}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{b.location}</td>
                    <td style={{ fontWeight: 500 }}>{b.managerName}</td>
                    <td className="amount" style={{ fontWeight: 700 }}>{formatINR(b.currentBalance)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDateTime(b.lastActivity)}</td>
                    <td><span className="badge badge-active">Active</span></td>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ fontWeight: 700 }} onClick={() => selectBranch(b.id)}>Manage</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      </div>
      <CreateBranchModal open={showCreate} onClose={() => setShowCreate(false)} />
      <TransferModal open={showTransfer} onClose={() => setShowTransfer(false)} />
    </>
  );
}

function CreateBranchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addBranch } = useApp();
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [manager, setManager] = useState('');
  const [capital, setCapital] = useState('');

  const handleSubmit = () => {
    if (!name || !location || !manager || !capital) return;
    addBranch({ name, location, managerName: manager, currentBalance: Number(capital), openingBalance: Number(capital) });
    setName(''); setLocation(''); setManager(''); setCapital('');
    onClose();
  };

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Create New Branch</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Branch Name</label><input className="form-input" placeholder="e.g. Pune West" value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Location</label><input className="form-input" placeholder="e.g. Pune, Maharashtra" value={location} onChange={e => setLocation(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Manager Name</label><input className="form-input" placeholder="e.g. Amit Patel" value={manager} onChange={e => setManager(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Initial Capital (₹)</label><input className="form-input" type="number" placeholder="e.g. 250000" value={capital} onChange={e => setCapital(e.target.value)} /><div className="form-hint">This amount will be allocated from HQ Treasury</div></div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>Create & Allocate</button></div>
      </div>
    </div>
  );
}

function TransferModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { branches, transferFunds } = useApp();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const fromBranch = branches.find(b => b.id === from);

  const handleSubmit = () => {
    setError('');
    if (!from || !to || !amount) { setError('All fields are required'); return; }
    if (from === to) { setError('Cannot transfer to the same branch'); return; }
    if (fromBranch && Number(amount) > fromBranch.currentBalance) { setError('Insufficient balance'); return; }
    transferFunds(from, to, Number(amount), notes);
    setFrom(''); setTo(''); setAmount(''); setNotes('');
    onClose();
  };

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Transfer Funds</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group"><label className="form-label">From Branch</label>
              <select className="form-select" value={from} onChange={e => setFrom(e.target.value)}>
                <option value="">Select source</option>
                {branches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name} — {formatINR(b.currentBalance)}</option>)}
              </select>
              {fromBranch && <div className="form-hint">Available: {formatINR(fromBranch.currentBalance)}</div>}
            </div>
            <div className="form-group"><label className="form-label">To Branch</label>
              <select className="form-select" value={to} onChange={e => setTo(e.target.value)}>
                <option value="">Select destination</option>
                {branches.filter((b: Branch) => b.id !== from).map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Amount (₹)</label><input className="form-input" type="number" placeholder="e.g. 50000" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Notes</label><input className="form-input" placeholder="Purpose of transfer" value={notes} onChange={e => setNotes(e.target.value)} /></div>
          {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>Confirm Transfer</button></div>
      </div>
    </div>
  );
}
