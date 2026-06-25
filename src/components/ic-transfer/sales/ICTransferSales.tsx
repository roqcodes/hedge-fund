'use client';

import React, { useState } from 'react';
import DateFilterBar from '@/components/ui/DateFilterBar';
import { useApp } from '@/context/AppContext';
import {
  CityMatrix,
  DataTableSection,
  ExportButtons,
  FilterChips,
  PageHeader,
  PageShell,
  SummaryPanel,
  useICTransferFilters,
  AddButton,
} from '../ui';
import AddSaleModal from './AddSaleModal';
import ViewSaleModal from './ViewSaleModal';
import { ICSale } from '@/types';

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
    const regionCols = icRegions.length > 0 ? icRegions : [];
    const colLabels = regionCols.length > 0 ? regionCols.map(r => r.name) : ['Total'];
    const numCols = Math.max(regionCols.length, 1);

    const initArray = () => new Array(numCols).fill(0);

    const salesVol = initArray();
    const salesRates = initArray();
    const statuses = new Array(numCols).fill('Processing');

    icSales.forEach(s => {
      const idx = regionCols.findIndex(r => r.id === s.locationId);
      const colIdx = idx >= 0 ? idx : 0;
      salesVol[colIdx] += s.units;
      salesRates[colIdx] = s.unitRate; // simplify to latest rate
    });

    const mRows = [
      {
        label: 'Sales',
        vol: salesVol,
        rates: salesRates,
        statuses: statuses as readonly string[],
      },
    ];
    return { salesColumns: colLabels, matrixRows: mRows };
  }, [icRegions, icSales]);

  return (
    <PageShell>
      <PageHeader
        title="Sales"
        subtitle="Customer sale orders and settlement status"
        actions={<AddButton label="Add Sale" onClick={() => setModalOpen(true)} />}
      />

      <SummaryPanel
        matrix={
          <CityMatrix
            columns={salesColumns}
            rows={matrixRows}
          />
        }
        balances={[
          { label: 'Opening', value: fmt(0), tone: 'blue' },
          { label: 'Closing', value: fmt(0), tone: 'green' },
        ]}
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
