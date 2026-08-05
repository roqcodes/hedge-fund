'use client';

import React, { useMemo, useState } from 'react';
import ICTransferDateFilterBar from '@/components/ic-transfer/shared/ICTransferDateFilterBar';
import { useICTransferRegionFilter } from '@/components/ic-transfer/shared/ICTransferFilterProvider';
import { matchesSelectedRegions } from '@/lib/icTransfer/regionFilter';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import { useApp } from '@/context/AppContext';
import {
  AddButton,
  DataTableSection,
  PageHeader,
  PageShell,
  useICTransferFilters,
} from '../ui';
import KPICard from '@/components/ui/KPICard';
import { portalKpiGrid, portalMobileCardFooterClass } from '@/lib/icTransfer/layoutConstants';
import {
  filterPurchasesForBranchPortal,
  filterSuppliersForAdminPortal,
  filterSuppliersForBranchPortal,
  filterWarehousesForBranchPortal,
  filterWarehousesForAdminPortal,
  type ICTransferPortalMode,
} from '@/lib/icTransfer/branchPortalScope';
import AddPurchaseModal from './AddPurchaseModal';
import ViewPurchaseModal from './ViewPurchaseModal';
import { ICPurchase } from '@/types';

const icCompactTd = (align: 'left'|'center'|'right') => `p-3 text-sm whitespace-nowrap text-${align}`;

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

const PURCHASE_COLUMNS = [
  'Date', 'ID', 'Supplier', 'Units', 'Total AED', 'Status', 'Actions'
];

type Props = {
  portalMode?: ICTransferPortalMode;
  branchId?: string;
};

export default function ICTransferPurchase({ portalMode = 'admin', branchId }: Props) {
  const { icPurchases, icSuppliers, icWarehouses, user } = useApp();
  // Branch managers (including on admin routes) may only use their branch warehouses/suppliers.
  const scopedBranchId =
    portalMode === 'branch' && branchId
      ? branchId
      : user?.role === 'branch_manager'
        ? user.branchId
        : undefined;
  const isBranchScoped = !!scopedBranchId;

  const scopedWarehouses = useMemo(() => {
    if (!isBranchScoped) return filterWarehousesForAdminPortal(icWarehouses);
    return filterWarehousesForBranchPortal(icWarehouses, scopedBranchId);
  }, [icWarehouses, isBranchScoped, scopedBranchId]);

  const scopedPurchases = useMemo(() => {
    if (!isBranchScoped) return icPurchases;
    return filterPurchasesForBranchPortal(icPurchases, icWarehouses, scopedBranchId);
  }, [icPurchases, icWarehouses, isBranchScoped, scopedBranchId]);

  const scopedSuppliers = useMemo(() => {
    if (isBranchScoped) return filterSuppliersForBranchPortal(icSuppliers, scopedBranchId);
    return filterSuppliersForAdminPortal(icSuppliers);
  }, [icSuppliers, isBranchScoped, scopedBranchId]);
  const { selectedRegionIds } = useICTransferRegionFilter();
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

  const getSupplierName = (id: string) => scopedSuppliers.find(s => s.id === id)?.name || icSuppliers.find(s => s.id === id)?.name || id;

  const filteredPurchases = scopedPurchases.filter(p => {
    const formattedId = getFormattedTxnId(p.id, 'purchase', p);
    if (search && 
        !formattedId.toLowerCase().includes(search.toLowerCase()) && 
        !p.id.toLowerCase().includes(search.toLowerCase()) && 
        !getSupplierName(p.supplierId || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (!matchesSelectedRegions(p.locationId, selectedRegionIds)) return false;
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
    const mRows = scopedSuppliers.map(s => {
       const supplierPurchases = scopedPurchases.filter(p => p.supplierId === s.id);
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
  }, [scopedSuppliers, scopedPurchases]);

  return (
    <PageShell>
      <PageHeader
        title="Purchase"
        subtitle={
          isBranchScoped
            ? 'Record stock purchases into your branch warehouses'
            : 'Track purchase orders across suppliers'
        }
        actions={<AddButton label="Add Purchase" onClick={() => setModalOpen(true)} />}
      />

      <ICTransferDateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      <div className={portalKpiGrid}>
        <KPICard 
          label="Total Purchases" 
          value={fmt(stats.total)} 
          subValue={`${filteredPurchases.length} orders`}
          color="var(--info)" 
          bgColor="var(--info-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
            </svg>
          } 
        />
        <KPICard 
          label="Total Units" 
          value={`${stats.totalUnits.toLocaleString()} Units`} 
          color="var(--accent)" 
          bgColor="var(--accent-light)" 
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M20 7h-9M14 3v8M3 17h18M3 21h18" />
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
        mobileView={
          filteredPurchases.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">No purchases found.</div>
          ) : (
            filteredPurchases.map(p => (
              <div
                key={p.id}
                onClick={() => handleView(p)}
                className="flex flex-col gap-3 rounded-2xl border p-4 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.06)] cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{getSupplierName(p.supplierId || '')}</p>
                  <p className="mt-0.5 text-xs font-mono text-slate-500">{getFormattedTxnId(p.id, 'purchase', p)}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{new Date(p.createdAt || '').toLocaleString()}</p>
                </div>
                <div className="flex justify-between items-center rounded-xl bg-slate-50/70 p-2.5 text-xs text-slate-500">
                  <span>Units: <strong className="text-slate-700">{p.units.toLocaleString()}</strong></span>
                  <span>Total: <strong className="text-slate-700">{(p.aedTotal || 0).toLocaleString()} AED</strong></span>
                </div>
                <div className={portalMobileCardFooterClass}>
                  <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    p.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {p.paymentStatus || 'pending'}
                  </span>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); handleView(p); }}
                    className="shrink-0 text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))
          )
        }
      >
        {filteredPurchases.map((p) => (
          <tr key={p.id} onClick={() => handleView(p)} className="cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 group">
            <td className={icCompactTd('left')}>{new Date(p.createdAt || '').toLocaleDateString()}</td>
            <td className={icCompactTd('left')}><span className="font-mono text-slate-500">{getFormattedTxnId(p.id, 'purchase', p)}</span></td>
            <td className={icCompactTd('left')}><span className="font-semibold text-slate-900">{getSupplierName(p.supplierId || '')}</span></td>
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
        branchId={scopedBranchId}
        warehouses={isBranchScoped ? scopedWarehouses : undefined}
      />
      <ViewPurchaseModal
        open={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedPurchase(null); }}
        purchase={selectedPurchase}
      />
    </PageShell>
  );
}
