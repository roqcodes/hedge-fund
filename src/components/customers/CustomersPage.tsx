'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { pageTitle, pageSubtitle, kpiGrid, tableWrap, dataTable, formInput } from '@/lib/ui';
import { getCustomersBySlug, deleteCustomer } from '@/app/actions/customerActions';
import { useApp } from '@/context/AppContext';
import { formatMoneyLabel, formatMoneyValue } from '@/data/mockData';
import KPICard from '@/components/ui/KPICard';
import CustomerModal from './CustomerModal';
import { useWriteAccess } from '@/context/RbacWriteContext';

type SortField = 'name' | 'phone' | 'email' | 'balance' | 'status' | 'created_at';
type SortDirection = 'asc' | 'desc';

type CustomerRow = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  balance: string | number;
  status: string;
  created_at?: string;
  hasOrders?: boolean;
};

const CUSTOMER_DELETE_BLOCKED_TOOLTIP =
  'Cannot delete: this customer has existing orders or transactions';

export default function CustomersPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { activeCurrency } = useApp();
  const { canWrite, writeBlockedReason, buttonProps: wp } = useWriteAccess();
  const fmtBalance = (value: string | number) => formatMoneyLabel(Number(value || 0), activeCurrency);

  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const fetchData = async () => {
    setLoading(true);
    const res = await getCustomersBySlug(slug);
    if (res.success && res.customers) setCustomers(res.customers);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [slug]);

  const handleRowClick = (customer: CustomerRow) => {
    router.push(`/${slug}/customers/${customer.id}`);
  };

  const handleEdit = (customer: CustomerRow, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canWrite) return;
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!canWrite) return;
    const customer = customers.find(c => c.id === id);
    if (customer?.hasOrders) {
      alert(CUSTOMER_DELETE_BLOCKED_TOOLTIP);
      return;
    }
    if (confirm('Are you sure you want to delete this customer?')) {
      const res = await deleteCustomer(id, slug);
      if (res.success) {
        fetchData();
      } else {
        alert('Failed to delete customer: ' + res.error);
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
  };

  const handleSave = () => {
    fetchData();
    handleModalClose();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'active').length;
  const totalBalance = customers.reduce((sum, c) => sum + Number(c.balance || 0), 0);

  const filteredAndSorted = useMemo(() => {
    let result = [...customers];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          (c.phone && c.phone.includes(q)) ||
          (c.email && c.email.toLowerCase().includes(q)),
      );
    }

    if (filterStatus) {
      result = result.filter(c => c.status === filterStatus);
    }

    result.sort((a, b) => {
      let valA: string | number = a[sortField] ?? '';
      let valB: string | number = b[sortField] ?? '';

      if (sortField === 'balance') {
        valA = Number(valA);
        valB = Number(valB);
      } else if (typeof valA === 'string' && typeof valB === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [customers, searchTerm, filterStatus, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 opacity-0 transition-opacity group-hover:opacity-100">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-accent">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  const getThClass = (align: 'left' | 'center' | 'right') =>
    `group cursor-pointer select-none px-3 pb-3 text-${align} text-[11px] font-bold uppercase tracking-wider text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 sm:px-5`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'inactive':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <>
      <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both]">
        <div className="mb-5 flex flex-col gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className={pageTitle}>Customers</h2>
            <p className={pageSubtitle}>Manage customer records, contact details, and balances</p>
          </div>
          <button
            onClick={() => canWrite && setIsModalOpen(true)}
            {...wp()}
            className={`flex size-10 items-center justify-center gap-2 rounded-xl bg-accent/10 text-accent transition-colors hover:bg-accent hover:text-white sm:h-auto sm:w-auto sm:rounded-lg sm:bg-accent sm:px-4 sm:py-2 sm:text-sm sm:font-semibold sm:text-white sm:hover:bg-accent/90${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
            title={!canWrite ? writeBlockedReason : 'New Customer'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span className="hidden sm:inline">New Customer</span>
          </button>
        </div>

        <div className={`${kpiGrid} mb-8`}>
          <KPICard
            label="Total Customers"
            value={totalCustomers}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
            color="var(--accent)"
            bgColor="var(--accent-light)"
          />
          <KPICard
            label="Active Customers"
            value={activeCustomers}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            }
            color="var(--profit)"
            bgColor="var(--profit-light)"
          />
          <KPICard
            label="Total Balance"
            value={formatMoneyValue(Number(totalBalance || 0), activeCurrency)}
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
            }
            color="#f59e0b"
            bgColor="#fef3c7"
          />
        </div>

        <div className="animate-[fade-in-up_0.55s_cubic-bezier(0.16,1,0.3,1)_both] md:overflow-hidden md:rounded-3xl md:border md:border-slate-100 md:bg-white md:shadow-surface md:transition-[box-shadow] md:duration-300 md:ease-[cubic-bezier(0.22,1,0.36,1)] md:motion-safe:hover:shadow-surface-hover">
          <div className="flex flex-col gap-4 px-4 pb-4 md:border-b md:border-slate-100 md:px-6 md:py-5 lg:flex-row lg:items-center lg:justify-between">
            <h3 className="hidden text-lg font-bold text-slate-900 lg:block">Customer List</h3>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
              <div className="relative w-full sm:max-w-xs">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className={`${formInput} w-full !py-2 !pl-10 !pr-4 !text-sm`}
                />
              </div>

              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className={`${formInput} w-full appearance-none bg-[length:16px] bg-[right_12px_center] bg-no-repeat !py-2 !pr-10 !text-sm sm:w-auto`}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--primary)]" />
            </div>
          ) : (
            <div className="p-0">
              <div className={tableWrap}>
                <table className={`${dataTable} hidden min-w-[800px] md:table`}>
                  <thead>
                    <tr>
                      <th className={getThClass('left')} onClick={() => handleSort('name')}>
                        <div className="flex items-center gap-2">
                          Name <SortIcon field="name" />
                        </div>
                      </th>
                      <th className={getThClass('left')} onClick={() => handleSort('phone')}>
                        <div className="flex items-center gap-2">
                          Phone <SortIcon field="phone" />
                        </div>
                      </th>
                      <th className={getThClass('left')} onClick={() => handleSort('email')}>
                        <div className="flex items-center gap-2">
                          Email <SortIcon field="email" />
                        </div>
                      </th>
                      <th className={getThClass('right')} onClick={() => handleSort('balance')}>
                        <div className="flex items-center justify-end gap-2">
                          Balance <SortIcon field="balance" />
                        </div>
                      </th>
                      <th className={getThClass('center')} onClick={() => handleSort('status')}>
                        <div className="flex items-center justify-center gap-2">
                          Status <SortIcon field="status" />
                        </div>
                      </th>
                      <th className="px-3 pb-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:px-5">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSorted.map(customer => (
                      <tr
                        key={customer.id}
                        data-interactive-row
                        onClick={() => handleRowClick(customer)}
                        className="cursor-pointer"
                      >
                        <td className="border-y border-l border-black/5 bg-white px-3 py-3.5 text-sm font-bold text-slate-900 first:rounded-l-2xl sm:px-5 sm:py-4">
                          {customer.name}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm text-slate-600 sm:px-5 sm:py-4">
                          {customer.phone || '—'}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-sm text-slate-600 sm:px-5 sm:py-4">
                          {customer.email || '—'}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-right font-mono text-sm font-bold sm:px-5 sm:py-4">
                          {fmtBalance(customer.balance)}
                        </td>
                        <td className="border-y border-black/5 bg-white px-3 py-3.5 text-center sm:px-5 sm:py-4">
                          <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${getStatusColor(customer.status)}`}>
                            {customer.status}
                          </span>
                        </td>
                        <td className="border-y border-r border-black/5 bg-white px-3 py-3.5 text-right last:rounded-r-2xl sm:px-5 sm:py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={e => handleEdit(customer, e)}
                              disabled={!canWrite}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[var(--primary)]${!canWrite ? ' cursor-not-allowed opacity-50' : ''}`}
                              title={!canWrite ? writeBlockedReason : 'Edit'}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>
                            <button
                              onClick={e => handleDelete(customer.id, e)}
                              disabled={!canWrite || customer.hasOrders}
                              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600${!canWrite || customer.hasOrders ? ' cursor-not-allowed opacity-50' : ''}`}
                              title={
                                customer.hasOrders
                                  ? CUSTOMER_DELETE_BLOCKED_TOOLTIP
                                  : !canWrite
                                    ? writeBlockedReason
                                    : 'Delete'
                              }
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredAndSorted.length === 0 && (
                      <tr>
                        <td colSpan={6} className="border-y border-black/5 bg-white px-5 py-8 text-center text-sm text-slate-500">
                          No customers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="flex flex-col gap-4 px-4 py-4 md:hidden">
                  {filteredAndSorted.map(customer => (
                    <div
                      key={customer.id}
                      onClick={() => handleRowClick(customer)}
                      className="flex cursor-pointer flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] transition-all hover:shadow-md active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">{customer.name}</span>
                        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${getStatusColor(customer.status)}`}>
                          {customer.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 border-y border-slate-50 py-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Phone</span>
                          <p className="text-sm text-slate-700">{customer.phone || '—'}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Email</span>
                          <p className="truncate text-sm text-slate-700">{customer.email || '—'}</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Balance</span>
                          <p className="font-mono text-sm font-bold text-slate-900">{fmtBalance(customer.balance)}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-accent">View Details →</span>
                    </div>
                  ))}
                  {filteredAndSorted.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                      No customers found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <CustomerModal
          slug={slug}
          open={isModalOpen}
          customer={editingCustomer}
          onClose={handleModalClose}
          onSave={handleSave}
        />
      )}
    </>
  );
}
