'use client';
import React, { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate } from '@/data/mockData';
import { Invoice, Branch } from '@/types';

export default function InvoicesPage() {
  const { invoices, branches, addInvoice } = useApp();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = statusFilter === 'all' ? invoices : invoices.filter((i: Invoice) => i.status === statusFilter);
  const totalPaid = invoices.filter((i: Invoice) => i.status === 'paid').reduce((s: number, i: Invoice) => s + i.amount, 0);
  const totalPending = invoices.filter((i: Invoice) => i.status === 'pending').reduce((s: number, i: Invoice) => s + i.amount, 0);
  const totalOverdue = invoices.filter((i: Invoice) => i.status === 'overdue').reduce((s: number, i: Invoice) => s + i.amount, 0);
  const totalValue = invoices.reduce((s: number, i: Invoice) => s + i.amount, 0);

  return (
    <>
      <div className="animate-in">
        <div className="page-header">
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Invoice Management</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>{invoices.length} total invoices — {invoices.filter(i => i.status === 'pending').length} pending collection</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} id="btn-create-invoice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
            Create Invoice
          </button>
        </div>

        <div className="kpi-grid-v2" style={{ marginBottom: 32 }}>
          <KPICard 
            label="Total Billed" 
            value={formatINR(totalValue)} 
            subValue="Life-time invoice value"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>}
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard 
            label="Paid Invoices" 
            value={formatINR(totalPaid)} 
            subValue="Successfully collected"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>}
            color="var(--profit)"
            bgColor="var(--profit-light)"
          />
          <KPICard 
            label="Pending Payment" 
            value={formatINR(totalPending)} 
            subValue="Current receivables"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
            color="var(--action)"
            bgColor="var(--action-light)"
          />
          <KPICard 
            label="Overdue Amount" 
            value={formatINR(totalOverdue)} 
            subValue="Requires immediate action"
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4m0 4h.01"/></svg>}
            color="var(--loss)"
            bgColor="var(--loss-light)"
          />
        </div>

        <div className="filters-bar">
          {['all', 'paid', 'pending', 'overdue'].map(s => (
            <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)} style={{ textTransform: 'capitalize' }}>{s === 'all' ? 'All Invoices' : s}</button>
          ))}
        </div>

        <div className="card animate-in">
          <div className="card-body">
            <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Invoice ID</th><th>Client</th><th>Branch</th><th>Amount</th><th>Date</th><th>Description</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((inv: Invoice) => (
                  <tr key={inv.id}>
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 12 }}>{inv.id}</td>
                    <td style={{ fontWeight: 500 }}>{inv.clientName}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{inv.branchName}</td>
                    <td className="amount">{formatINR(inv.amount)}</td>
                    <td style={{ fontSize: 12 }}>{formatDate(inv.date)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.description}</td>
                    <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>

      <CreateInvoiceModal open={showCreate} onClose={() => setShowCreate(false)} branches={branches} addInvoice={addInvoice} />
    </>
  );
}

function CreateInvoiceModal({ open, onClose, branches, addInvoice }: { open: boolean; onClose: () => void; branches: Branch[]; addInvoice: (i: any) => void }) {
  const [client, setClient] = useState('');
  const [branchId, setBranchId] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');

  const handleSubmit = () => {
    if (!client || !branchId || !amount || !desc) return;
    const branch = branches.find(b => b.id === branchId);
    addInvoice({ clientName: client, branchId, branchName: branch?.name || '', amount: Number(amount), description: desc, date: new Date().toISOString().split('T')[0] });
    setClient(''); setBranchId(''); setAmount(''); setDesc('');
    onClose();
  };

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header"><h3>Create Invoice</h3><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Client Name</label><input className="form-input" placeholder="e.g. Tata Motors Ltd" value={client} onChange={e => setClient(e.target.value)} /></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Branch</label>
              <select className="form-select" value={branchId} onChange={e => setBranchId(e.target.value)}>
                <option value="">Select branch</option>
                {branches.map((b: Branch) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Amount (₹)</label><input className="form-input" type="number" placeholder="e.g. 75000" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          </div>
          <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" rows={3} placeholder="Service details..." value={desc} onChange={e => setDesc(e.target.value)} /></div>
        </div>
        <div className="modal-footer"><button className="btn btn-secondary" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={handleSubmit}>Create Invoice</button></div>
      </div>
    </div>
  );
}
