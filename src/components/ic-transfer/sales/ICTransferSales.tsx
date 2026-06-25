'use client';

import React, { useState } from 'react';
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
import { PhysicalSingleKPICard } from '@/components/physical/PhysicalSplitKPICard';
import { kpiGrid } from '@/lib/ui';

const icCompactTd = (align: 'left'|'center'|'right') => `p-3 text-sm whitespace-nowrap text-${align}`;

const fmt = (n: number) => `AED ${n.toLocaleString('en-AE', { minimumFractionDigits: 2 })}`;

const SALE_COLUMNS = [
  'Date', 'ID', 'Customer', 'Location', 'Units', 'Total AED', 'Status', 'Actions'
];

export default function ICTransferSales() {
  const { icSales, icRegions, updateICSale } = useApp();
  const [location, setLocation] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<ICSale | null>(null);
  const [search, setSearch] = useState('');
  const {
    dateFilter,
    setDateFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
  } = useICTransferFilters();

  const getLocationName = (id: string) => icRegions.find(r => r.id === id)?.name || id;

  const filteredSales = icSales.filter(s => {
    if (search && !s.id.toLowerCase().includes(search.toLowerCase()) && !s.customerName.toLowerCase().includes(search.toLowerCase())) return false;
    if (location !== 'All' && getLocationName(s.locationId || '') !== location) return false;
    return true;
  });

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
      const regionSales = icSales.filter(s => s.locationId === r.id);
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
        actions={<AddButton label="Add Sale" onClick={() => setModalOpen(true)} />}
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

      <div className={kpiGrid}>
        <PhysicalSingleKPICard label="Opening Balance" value={fmt(0)} color="var(--info)" bgColor="var(--info-light)" icon={<></>} />
        <PhysicalSingleKPICard label="Closing Balance" value={fmt(0)} color="var(--success)" bgColor="var(--success-light)" icon={<></>} />
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
      >
        {filteredSales.map((s) => (
          <tr key={s.id} onClick={() => handleView(s)} className="cursor-pointer hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 group">
            <td className={icCompactTd('left')}>{new Date(s.createdAt || '').toLocaleDateString()}</td>
            <td className={icCompactTd('left')}><span className="font-mono text-slate-500">{s.id.substring(0, 8)}</span></td>
            <td className={icCompactTd('left')}><span className="font-semibold text-slate-900">{s.customerName}</span></td>
            <td className={icCompactTd('left')}>{getLocationName(s.locationId || '')}</td>
            <td className={icCompactTd('right')}>{s.units.toLocaleString()}</td>
            <td className={icCompactTd('right')}><span className="font-bold text-slate-900">{(s.aedAmount || 0).toLocaleString()}</span></td>
            <td className={icCompactTd('center')}>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                s.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {s.paymentStatus || 'pending'}
              </span>
            </td>
            <td className={icCompactTd('center')}>
              <div className="flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleView(s); }}
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
                  onClick={(e) => { e.stopPropagation(); handleEdit(s); }}
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

      <AddSaleModal 
        open={modalOpen} 
        onClose={() => { setModalOpen(false); setSelectedSale(null); }} 
        initialData={selectedSale || undefined}
      />
      <ViewSaleModal
        open={viewModalOpen}
        onClose={() => { setViewModalOpen(false); setSelectedSale(null); }}
        sale={selectedSale}
      />
    </PageShell>
  );
}
