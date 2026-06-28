'use client';

import React, { useState, useMemo } from 'react';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { useApp } from '@/context/AppContext';
import {
  DataTableSection,
  ExportButtons,
  FilterChips,
  PageHeader,
  PageShell,
  useICTransferFilters,
  AddButton,
  SectionCard,
} from '../ui';
import AddSaleModal from './AddSaleModal';
import ViewSaleModal from './ViewSaleModal';
import { ICSale } from '@/types';
import PhysicalSplitKPICard, { PhysicalSingleKPICard } from '@/components/physical/PhysicalSplitKPICard';
import { kpiGrid } from '@/lib/ui';

const icCompactTd = (align: 'left'|'center'|'right') => `p-3 text-sm whitespace-nowrap text-${align}`;

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

const SALE_COLUMNS = [
  'Date', 'Customer', 'Units', 'Total AED', 'Collected Amount', 'Remaining Amount', 'Priority', 'Status'
];

export default function ICTransferSales() {
  const { icSales, icRegions, icWarehouses, updateICSale, icRates } = useApp();
  const [location, setLocation] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ICSale | null>(null);
  const [search, setSearch] = useState('');
  
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterWarehouse, setFilterWarehouse] = useState('All');

  const [sortField, setSortField] = useState<string>('Date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useICTransferFilters();

  const activeRate = icRates.length > 0 ? icRates[0] : null;
  const saleRate = activeRate?.saleRate || 0;
  const inrConversion = activeRate?.inrConversion || 0;
  const sarConversion = activeRate?.sarConversion || 0;

  const getWarehouseName = (id?: string) => icWarehouses.find(w => w.id === id)?.name || 'None';
  const getRegionNameByWarehouseId = (id?: string) => {
    const warehouse = icWarehouses.find(w => w.id === id);
    return warehouse ? icRegions.find(r => r.id === warehouse.regionId)?.name || 'Unknown' : 'Unknown';
  };

  const filteredSales = useMemo<ICSale[]>(() => {
    return icSales.filter((s: ICSale) => {
      // ── Date filter (was a no-op before — now applied) ──────────────────
      const createdAt = s.createdAt ? new Date(s.createdAt) : null;
      if (createdAt && dateFilter !== 'all-time') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
        const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        if (dateFilter === 'today') {
          if (createdAt < today) return false;
        } else if (dateFilter === 'yesterday') {
          if (createdAt < yesterday || createdAt >= today) return false;
        } else if (dateFilter === 'this-week') {
          if (createdAt < startOfWeek) return false;
        } else if (dateFilter === 'this-month') {
          if (createdAt < startOfMonth) return false;
        } else if (dateFilter === 'custom' && (customStartDate || customEndDate)) {
          if (customStartDate) {
            const from = new Date(customStartDate); from.setHours(0, 0, 0, 0);
            if (createdAt < from) return false;
          }
          if (customEndDate) {
            const to = new Date(customEndDate); to.setHours(23, 59, 59, 999);
            if (createdAt > to) return false;
          }
        }
      }

      if (search && !s.id.toLowerCase().includes(search.toLowerCase()) && !s.customerName.toLowerCase().includes(search.toLowerCase())) return false;
      if (location !== 'All' && getRegionNameByWarehouseId(s.warehouseId) !== location) return false;

      if (filterStatus !== 'All') {
        if (filterStatus === 'paid') return s.paymentStatus === 'paid';
        if (filterStatus === 'pending') return s.paymentStatus === 'pending';
        if (filterStatus === 'Partial') return s.deliveryStatus === 'Partial';
      }
      if (filterWarehouse !== 'All') {
        if (filterWarehouse === 'None') return !s.warehouseId;
        return s.warehouseId === filterWarehouse;
      }
      return true;
    });
  }, [icSales, search, location, filterStatus, filterWarehouse, dateFilter, customStartDate, customEndDate]);

  const handleHeaderClick = (colName: string) => {
    const map: Record<string, string> = {
      'Date': 'Date',
      'Customer': 'Customer',
      'Units': 'Units',
      'Total AED': 'Total AED',
      'Collected Amount': 'Collected Amount',
      'Remaining Amount': 'Remaining Amount',
      'Priority': 'Priority',
      'Status': 'Status',
    };
    const field = map[colName] ?? 'Date';
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedSales = useMemo<ICSale[]>(() => {
    const sorted = [...filteredSales];
    sorted.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'Customer') {
        valA = a.customerName || '';
        valB = b.customerName || '';
      } else if (sortField === 'Units') {
        valA = Number(a.units || 0);
        valB = Number(b.units || 0);
      } else if (sortField === 'Total AED') {
        valA = Number(a.aedAmount || 0);
        valB = Number(b.aedAmount || 0);
      } else if (sortField === 'Collected Amount') {
        valA = Number(a.collectedAmount || 0);
        valB = Number(b.collectedAmount || 0);
      } else if (sortField === 'Remaining Amount') {
        valA = Number(a.aedAmount || 0) - Number(a.collectedAmount || 0);
        valB = Number(b.aedAmount || 0) - Number(b.collectedAmount || 0);
      } else if (sortField === 'Priority') {
        const order: Record<string, number> = { High: 0, Normal: 1, Low: 2 };
        valA = order[a.priority || 'Normal'] ?? 1;
        valB = order[b.priority || 'Normal'] ?? 1;
      } else if (sortField === 'Status') {
        valA = a.deliveryStatus || 'Pending';
        valB = b.deliveryStatus || 'Pending';
      } else {
        valA = new Date(a.createdAt || '').getTime();
        valB = new Date(b.createdAt || '').getTime();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredSales, sortField, sortOrder]);

  const stats = useMemo(() => {
    const totalOrders = filteredSales.length;
    const totalValue = filteredSales.reduce((acc: number, s: ICSale) => acc + (s.aedAmount || 0), 0);
    const totalUnits = filteredSales.reduce((acc: number, s: ICSale) => acc + s.units, 0);
    const avgRate = totalUnits > 0 ? totalValue / totalUnits : 0;
    
    const pendingCount = filteredSales.filter((s: ICSale) => s.deliveryStatus === 'Pending' || !s.deliveryStatus).length;
    const partialCount = filteredSales.filter((s: ICSale) => s.deliveryStatus === 'Partial').length;
    const completedCount = filteredSales.filter((s: ICSale) => s.deliveryStatus === 'Completed').length;
    
    const totalPartialAmountReceived = filteredSales
      .filter((s: ICSale) => s.deliveryStatus === 'Partial')
      .reduce((acc: number, s: ICSale) => acc + (s.collectedAmount || 0), 0);

    return {
      totalOrders,
      totalValue,
      totalUnits,
      avgRate,
      pendingCount,
      partialCount,
      completedCount,
      totalPartialAmountReceived
    };
  }, [filteredSales]);

  const handleEdit = (s: ICSale) => {
    setSelectedSale(s);
    setModalOpen(true);
  };

  const handleView = (s: ICSale) => {
    setSelectedSale(s);
    setViewModalOpen(true);
  };

  const { salesColumns, matrixRows } = React.useMemo(() => {
    const columns = ['Sales Vol', 'Sales Rate', 'Status'];
    const mRows = icRegions.map(r => {
      const regionWarehouses = new Set(icWarehouses.filter(w => w.regionId === r.id).map(w => w.id));
      const regionSales = icSales.filter(s => s.warehouseId && regionWarehouses.has(s.warehouseId));
      const vol = regionSales.reduce((acc, s) => acc + s.units, 0);
      const rate = regionSales.length > 0 ? regionSales[0].unitRate : 0;
      return {
        label: r.name,
        metrics: [
          { label: 'Sales Vol', value: vol },
          { label: 'Sales Rate', value: rate.toLocaleString() },
          { label: 'Status', value: 'Processing' },
        ]
      };
    });
    return { salesColumns: columns, matrixRows: mRows };
  }, [icRegions, icSales]);

  return (
    <PageShell>
      <PageHeader
        title="Sales"
        subtitle="Customer sale orders and settlement status"
        actions={
          <div className="flex items-center gap-3">
            {saleRate > 0 && (
              <div className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-1.5 shadow-sm flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AED:</span>
                  <span className="text-xs font-extrabold text-accent">{saleRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {inrConversion > 0 && (
                  <div className="flex items-center gap-1.5 border-l border-slate-100 pl-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">INR:</span>
                    <span className="text-xs font-extrabold text-emerald-600">{(saleRate * inrConversion).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                {sarConversion > 0 && (
                  <div className="flex items-center gap-1.5 border-l border-slate-100 pl-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SAR:</span>
                    <span className="text-xs font-extrabold text-indigo-600">{(saleRate * sarConversion).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
            )}
            <AddButton label="Add Sale" onClick={() => setModalOpen(true)} />
          </div>
        }
      />

      <DateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <FilterChips
        options={['All', ...icRegions.map(r => r.name)]}
        value={location}
        onChange={setLocation}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PhysicalSplitKPICard 
          top={{ label: 'Total Orders', value: `${stats.totalOrders} Orders` }}
          bottom={{ label: 'Total Value', value: fmt(stats.totalValue) }}
          color="var(--info)" 
          bgColor="var(--info-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
            </svg>
          } 
        />
        <PhysicalSplitKPICard 
          top={{ label: 'Total Units', value: `${stats.totalUnits.toLocaleString()} Units` }}
          bottom={{ label: 'Average Rate', value: fmt(stats.avgRate) }}
          color="var(--profit)" 
          bgColor="var(--profit-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          } 
        />
        <PhysicalSplitKPICard 
          top={{ label: 'Active Orders', value: `${stats.pendingCount + stats.partialCount} Active` }}
          bottom={{ label: 'Paid Orders', value: `${stats.completedCount} Paid` }}
          color="var(--pending)" 
          bgColor="var(--pending-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          } 
        />
        <PhysicalSplitKPICard 
          top={{ label: 'Partial Orders', value: `${stats.partialCount} Partial` }}
          bottom={{ label: 'Collected Amount', value: fmt(stats.totalPartialAmountReceived) }}
          color="var(--accent)" 
          bgColor="var(--accent-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          } 
        />
      </div>

      <div className="mb-5">
        <DataTableSection
          title="Sales Matrix"
          columns={['Customer', ...salesColumns]}
          data={matrixRows.map(r => [
            r.label,
            ...r.metrics.map(m => typeof m.value === 'number' ? m.value.toLocaleString() : m.value)
          ])}
        />
      </div>

      <DataTableSection
        title="All Sales"
        columns={SALE_COLUMNS}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search sales..."
        onHeaderClick={handleHeaderClick}
        sortField={sortField === 'Date' ? 'Date' : sortField}
        sortOrder={sortOrder}
        toolbar={
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 bg-white shadow-sm focus:border-accent focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="pending">Pending Paid</option>
              <option value="paid">Fully Paid</option>
              <option value="Partial">Partial Delivered</option>
            </select>

            <select
              value={filterWarehouse}
              onChange={(e) => setFilterWarehouse(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 bg-white shadow-sm focus:border-accent focus:outline-none"
            >
              <option value="All">All Warehouses</option>
              <option value="None">No Warehouse</option>
              {icWarehouses.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        }
      >
        {sortedSales.map((s: ICSale) => {
          const total = s.aedAmount || 0;
          const collected = s.collectedAmount || 0;
          const remaining = Math.max(0, total - collected);
          const priority = s.priority || 'Normal';
          const deliveryStatus = s.deliveryStatus || 'Pending';

          const priorityStyle =
            priority === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
            priority === 'Low'  ? 'bg-slate-50 text-slate-500 border-slate-200' :
                                  'bg-slate-100 text-slate-600 border-slate-200';

          const statusStyle =
            deliveryStatus === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
            deliveryStatus === 'Partial'   ? 'bg-amber-50 text-amber-700 border-amber-200' :
            deliveryStatus === 'Cancelled' ? 'bg-red-50 text-red-700 border-red-200' :
                                             'bg-slate-50 text-slate-500 border-slate-200';

          return (
            <tr
              key={s.id}
              onClick={() => handleView(s)}
              className="cursor-pointer hover:bg-slate-50/60 transition-colors border-b border-slate-100 last:border-0"
            >
              {/* DATE */}
              <td className={icCompactTd('left')}>
                <div className="leading-tight">
                  <div className="font-semibold text-slate-800 text-xs">
                    {new Date(s.createdAt || '').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(s.createdAt || '').toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </td>

              {/* CUSTOMER */}
              <td className={icCompactTd('left')}>
                <span className="font-semibold text-slate-900">{s.customerName}</span>
              </td>

              {/* UNITS */}
              <td className={icCompactTd('right')}>
                <span className="tabular-nums font-medium text-slate-700">{s.units.toLocaleString()}</span>
              </td>

              {/* TOTAL AED */}
              <td className={icCompactTd('right')}>
                <span className="tabular-nums font-bold text-slate-900">
                  {total.toLocaleString()} <span className="font-normal text-slate-400 text-[10px]">AED</span>
                </span>
              </td>

              {/* COLLECTED AMOUNT */}
              <td className={icCompactTd('right')}>
                <span className="tabular-nums font-bold text-emerald-600">
                  {collected.toLocaleString()} <span className="font-normal text-emerald-400 text-[10px]">AED</span>
                </span>
              </td>

              {/* REMAINING AMOUNT */}
              <td className={icCompactTd('right')}>
                <span className={`tabular-nums font-bold ${remaining > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {remaining.toLocaleString()} <span className="font-normal text-[10px] opacity-60">AED</span>
                </span>
              </td>

              {/* PRIORITY */}
              <td className={icCompactTd('center')}>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider border ${priorityStyle}`}>
                  {priority}
                </span>
              </td>

              {/* STATUS */}
              <td className={icCompactTd('center')}>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider border ${statusStyle}`}>
                  {deliveryStatus}
                </span>
              </td>
            </tr>
          );
        })}
      </DataTableSection>

      <AddSaleModal 
        open={modalOpen} 
        onClose={() => { setModalOpen(false); setSelectedSale(null); }} 
        initialData={selectedSale || undefined}
      />
      <ViewSaleModal
        open={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedSale(null); }}
        sale={selectedSale}
        onEdit={handleEdit}
      />
    </PageShell>
  );
}
