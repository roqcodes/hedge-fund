'use client';
import React, { useState } from 'react';
import KPICard from '@/components/ui/KPICard';
import Modal from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { formatINR, formatDate } from '@/data/mockData';
import { Invoice, Branch } from '@/types';
import { badgeClass } from '@/lib/badgeClass';
import { btnPrimary, btnSecondary, filterChip, filterChipActive, formGroup, formInput, formLabel, formRow, formSelect, formTextarea, kpiGrid, pageHeader, pageTitle, tableWrap, dataTable } from '@/lib/ui';

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
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className={pageHeader}>
          <div>
            <h2 className={pageTitle}>Invoice Management</h2>
            <p className="mt-1 text-sm text-slate-500">
              {invoices.length} total invoices — {invoices.filter(i => i.status === 'pending').length} pending collection
            </p>
          </div>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => setShowCreate(true)} id="btn-create-invoice">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14m-7-7h14" />
            </svg>
            Create Invoice
          </button>
        </div>

        <div className={kpiGrid}>
          <KPICard
            label="Total Billed"
            value={formatINR(totalValue)}
            subValue="Life-time invoice value"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard
            label="Paid Invoices"
            value={formatINR(totalPaid)}
            subValue="Successfully collected"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
            }
            color="var(--profit)"
            bgColor="var(--profit-light)"
          />
          <KPICard
            label="Pending Payment"
            value={formatINR(totalPending)}
            subValue="Current receivables"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            }
            color="var(--action)"
            bgColor="var(--action-light)"
          />
          <KPICard
            label="Overdue Amount"
            value={formatINR(totalOverdue)}
            subValue="Requires immediate action"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <path d="M12 9v4m0 4h.01" />
              </svg>
            }
            color="var(--loss)"
            bgColor="var(--loss-light)"
          />
        </div>

        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-surface transition-[box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-3 border-b border-black/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-slate-900 sm:text-lg">Invoice register</h3>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500 sm:text-xs">
                {filtered.length} of {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
                {statusFilter !== 'all'
                  ? ` · ${statusFilter.charAt(0).toUpperCase()}${statusFilter.slice(1)}`
                  : ''}
              </p>
            </div>
            <div
              className="flex flex-wrap items-center gap-1.5 sm:max-w-none sm:justify-end"
              role="group"
              aria-label="Filter by status"
            >
              {['all', 'paid', 'pending', 'overdue'].map(s => (
                <button
                  key={s}
                  type="button"
                  className={`shrink-0 capitalize ${statusFilter === s ? filterChipActive : filterChip}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === 'all' ? 'All' : s}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3 sm:p-4 lg:p-5">
            <div className={tableWrap}>
              <table className={`${dataTable} min-w-[800px]`}>
                <thead>
                  <tr>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Invoice ID</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Client</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Branch</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Amount</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Date</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Description</th>
                    <th className="px-3 pb-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv: Invoice) => (
                    <tr key={inv.id} data-interactive-row>
                      <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 font-mono text-xs font-semibold first:rounded-l-2xl sm:px-5 sm:py-4 sm:text-sm">
                        {inv.id}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm font-medium sm:px-5 sm:py-4">{inv.clientName}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm text-slate-500 sm:px-5 sm:py-4">{inv.branchName}</td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 font-mono text-sm font-bold sm:px-5 sm:py-4 sm:text-base">
                        {formatINR(inv.amount)}
                      </td>
                      <td className="border-y border-black/5 bg-white px-3 py-3.5 text-xs sm:px-5 sm:py-4 sm:text-sm">{formatDate(inv.date)}</td>
                      <td className="max-w-[220px] border-y border-black/5 bg-white px-3 py-3.5 text-xs text-slate-500 sm:px-5 sm:py-4 sm:text-sm">
                        <span className="block truncate">{inv.description}</span>
                      </td>
                      <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 last:rounded-r-2xl sm:px-5 sm:py-4">
                        <span className={badgeClass(inv.status)}>{inv.status}</span>
                      </td>
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

function CreateInvoiceModal({
  open,
  onClose,
  branches,
  addInvoice,
}: {
  open: boolean;
  onClose: () => void;
  branches: Branch[];
  addInvoice: (i: Omit<Invoice, 'id' | 'status'>) => void;
}) {
  const [client, setClient] = useState('');
  const [branchId, setBranchId] = useState('');
  const [amount, setAmount] = useState('');
  const [desc, setDesc] = useState('');

  const handleSubmit = () => {
    if (!client || !branchId || !amount || !desc) return;
    const branch = branches.find(b => b.id === branchId);
    addInvoice({
      clientName: client,
      branchId,
      branchName: branch?.name || '',
      amount: Number(amount),
      description: desc,
      date: new Date().toISOString().split('T')[0],
    });
    setClient('');
    setBranchId('');
    setAmount('');
    setDesc('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Invoice"
      footer={
        <>
          <button type="button" className={`${btnSecondary} w-full sm:w-auto`} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={handleSubmit}>
            Create Invoice
          </button>
        </>
      }
    >
      <div className={formGroup}>
        <label className={formLabel}>Client Name</label>
        <input className={formInput} placeholder="e.g. Tata Motors Ltd" value={client} onChange={e => setClient(e.target.value)} />
      </div>
      <div className={formRow}>
        <div className={formGroup}>
          <label className={formLabel}>Branch</label>
          <select className={formSelect} value={branchId} onChange={e => setBranchId(e.target.value)}>
            <option value="">Select branch</option>
            {branches.map((b: Branch) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className={formGroup}>
          <label className={formLabel}>Amount (₹)</label>
          <input className={formInput} type="number" placeholder="e.g. 75000" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>
      </div>
      <div className={formGroup}>
        <label className={formLabel}>Description</label>
        <textarea className={formTextarea} rows={3} placeholder="Service details..." value={desc} onChange={e => setDesc(e.target.value)} />
      </div>
    </Modal>
  );
}
