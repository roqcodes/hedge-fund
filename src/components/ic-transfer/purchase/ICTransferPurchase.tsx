'use client';

import React, { useState } from 'react';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { IC_TRANSFER_CITIES } from '@/lib/icTransfer/nav';
import { useApp } from '@/context/AppContext';
import {
  AddButton,
  DataTableSection,
  ExportButtons,
  FilterChips,
  PageHeader,
  PageShell,
  SectionCard,
  useICTransferFilters,
} from '../ui';
import KPICard from '@/components/ui/KPICard';
import { kpiGrid } from '@/lib/ui';
import AddPurchaseModal from './AddPurchaseModal';
import ViewPurchaseModal from './ViewPurchaseModal';
import { ICPurchase } from '@/types';

const icCompactTd = (align: 'left'|'center'|'right') => `p-3 text-sm whitespace-nowrap text-${align}`;

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

const PURCHASE_COLUMNS = [
  'Date', 'ID', 'Supplier', 'Location', 'Units', 'Total AED', 'Status', 'Actions'
];

export default function ICTransferPurchase() {
  const { icPurchases, icSuppliers, icWarehouses, icRegions, updateICPurchase } = useApp();
  const [cityFilter, setCityFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<ICPurchase | null>(null);
  const [search, setSearch] = useState('');
  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useICTransferFilters();

  const getSupplierName = (id: string) => icSuppliers.find(s => s.id === id)?.name || id;
  const getWarehouseName = (id: string) => icWarehouses.find(w => w.id === id)?.name || id;
  const getLocationName = (id: string) => icRegions.find(r => r.id === id)?.name || id;

  const filteredPurchases = icPurchases.filter(p => {
    if (search && !p.id.toLowerCase().includes(search.toLowerCase()) && !getSupplierName(p.supplierId || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (cityFilter !== 'All' && getLocationName(p.locationId || '') !== cityFilter) return false;
    return true;
  });

  const stats = React.useMemo(() => {
    const total = filteredPurchases.reduce((acc, p) => acc + (p.aedTotal || 0), 0);
    const paid = filteredPurchases.filter(p => p.paymentStatus === 'paid').reduce((acc, p) => acc + (p.aedTotal || 0), 0);
    const unpaid = total - paid;
    const totalUnits = filteredPurchases.reduce((acc, p) => acc + (p.units || 0), 0);
    return { total, paid, unpaid, totalUnits };
  }, [filteredPurchases]);

  const handleEdit = (p: ICPurchase) => {
    setSelectedPurchase(p);
    setModalOpen(true);
  };

  const handleView = (p: ICPurchase) => {
    setSelectedPurchase(p);
    setViewModalOpen(true);
  };

  const { purchaseColumns, matrixRows } = React.useMemo(() => {
    const columns = ['Purchase Vol', 'Purchase Rate', 'Due Vol', 'Due Rate'];
    const mRows = icSuppliers.map(s => {
       const supplierPurchases = icPurchases.filter(p => p.supplierId === s.id);
       const vol = supplierPurchases.reduce((acc, p) => acc + p.units, 0);
       const rate = supplierPurchases.length > 0 ? supplierPurchases[0].unitRate : 0;
       return {
         label: s.name,
         metrics: [
           { label: 'Purchase Vol', value: vol },
           { label: 'Purchase Rate', value: rate.toLocaleString() },
           { label: 'Due Vol', value: 0 },
           { label: 'Due Rate', value: 0 },
         ]
       };
    });
    return { purchaseColumns: columns, matrixRows: mRows };
  }, [icSuppliers, icPurchases]);

  return (
    <PageShell>
      <PageHeader
        title="Purchase"
        subtitle="Track purchase orders across suppliers"
        actions={<AddButton label="Add Purchase" onClick={() => setModalOpen(true)} />}
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
        value={cityFilter}
        onChange={setCityFilter}
      />

      <div className={`${kpiGrid} grid-cols-1 sm:grid-cols-3 mb-6`}>
        <KPICard 
          label="Total Purchases" 
          value={fmt(stats.total)} 
          subValue={`Volume: ${stats.totalUnits.toLocaleString()} units`}
          color="var(--info)" 
          bgColor="var(--info-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
            </svg>
          } 
        />
        <KPICard 
          label="Total Paid" 
          value={fmt(stats.paid)} 
          color="var(--profit)" 
          bgColor="var(--profit-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          } 
        />
        <KPICard 
          label="Remaining Due" 
          value={fmt(stats.unpaid)} 
          color="var(--warning)" 
          bgColor="var(--warning-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
            </svg>
          } 
        />
      </div>

      <div className="mb-5">
        <DataTableSection
          title="Purchase Matrix"
          columns={['Supplier', ...purchaseColumns]}
          data={matrixRows.map(r => [
            r.label,
            ...r.metrics.map(m => typeof m.value === 'number' ? m.value.toLocaleString() : m.value)
          ])}
        />
      </div>

      <DataTableSection
        title="All Purchases"
        columns={PURCHASE_COLUMNS}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search purchases..."
      >
        {filteredPurchases.map((p) => (
          <tr key={p.id} onClick={() => handleView(p)} className="cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 group">
            <td className={icCompactTd('left')}>{new Date(p.createdAt || '').toLocaleDateString()}</td>
            <td className={icCompactTd('left')}><span className="font-mono text-slate-500">{p.id.substring(0, 8)}</span></td>
            <td className={icCompactTd('left')}><span className="font-semibold text-slate-900">{getSupplierName(p.supplierId || '')}</span></td>
            <td className={icCompactTd('left')}>{getLocationName(p.locationId || '')}</td>
            <td className={icCompactTd('right')}>{p.units.toLocaleString()}</td>
            <td className={icCompactTd('right')}><span className="font-bold text-slate-900">{(p.aedTotal || 0).toLocaleString()}</span></td>
            <td className={icCompactTd('center')}>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                p.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {p.paymentStatus || 'pending'}
              </span>
            </td>
            <td className={icCompactTd('center')}>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleView(p); }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all duration-150 hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95"
                  title="More Info"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 shadow-sm transition-all duration-150 hover:border-accent hover:bg-accent/5 hover:text-accent active:scale-95"
                  title="Edit"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        ))}
      </DataTableSection>

      <AddPurchaseModal 
        open={modalOpen} 
        onClose={() => { setModalOpen(false); setSelectedPurchase(null); }} 
        initialData={selectedPurchase || undefined} 
      />
      <ViewPurchaseModal
        open={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedPurchase(null); }}
        purchase={selectedPurchase}
      />
    </PageShell>
  );
}
