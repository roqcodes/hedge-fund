'use client';

import React, { useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { btnPrimary, btnSecondary } from '@/lib/ui';
import { downloadCsv } from '@/lib/finance/exportReports';
import {
  buildFundExportLedger,
  formatFundExportDate,
  type FundExportLedgerRow,
} from '@/lib/funds/fundExportLedger';
import { resolveDateFilterRange } from '@/lib/dateFilterRange';
import type { Customer, FundEntityLedgerEntry } from '@/types';

interface FundExportModalProps {
  open: boolean;
  onClose: () => void;
  entries: FundEntityLedgerEntry[];
  customers: Customer[];
  dateFilter: string;
  customStartDate: string;
  customEndDate: string;
}

function fmtAmount(value: number | null): string {
  if (value == null || value <= 0) return '';
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PreviewTable({ rows }: { rows: FundExportLedgerRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="max-h-[65vh] overflow-auto">
        <table className="w-full min-w-[960px] text-left text-[11px] whitespace-nowrap">
          <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm">
            <tr>
              <th colSpan={8} className="border-b border-r border-slate-200 bg-sky-100 px-3 py-2 text-center font-bold text-sky-900">
                POSITION
              </th>
            </tr>
            <tr>
              <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">DATE</th>
              <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">TYPE</th>
              <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">COUNTERPARTY</th>
              <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">DESCRIPTION</th>
              <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">AMOUNT</th>
              <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700 bg-slate-200/50">DEBIT</th>
              <th className="border-b border-slate-200 px-3 py-2 font-bold text-slate-700 bg-slate-200/50">CREDIT</th>
              <th className="border-b border-slate-200 px-3 py-2 font-bold text-slate-700 bg-slate-200/50">BALANCE</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={`${row.date}-${row.txnType}-${index}`} className="transition-colors hover:bg-slate-50">
                  <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-600">{formatFundExportDate(row.date)}</td>
                  <td className="border-b border-r border-slate-100 px-3 py-2 font-medium text-slate-700">{row.txnType}</td>
                  <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-900">{row.counterparty}</td>
                  <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-900">{row.description}</td>
                  <td className="border-b border-r border-slate-100 px-3 py-2 text-right text-slate-700">
                    {row.walletAmount != null ? `${fmtAmount(row.walletAmount)} ${row.walletCurrency}` : ''}
                  </td>
                  <td className="border-b border-r border-slate-100 bg-slate-50 px-3 py-2 text-right font-medium text-emerald-700">
                    {row.debit > 0 ? fmtAmount(row.debit) : ''}
                  </td>
                  <td className="border-b border-r border-slate-100 bg-slate-50 px-3 py-2 text-right font-medium text-red-600">
                    {row.credit > 0 ? fmtAmount(row.credit) : ''}
                  </td>
                  <td className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-right font-bold text-slate-900">
                    {fmtAmount(row.balance)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">
                  No records found to export for this customer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function FundExportModal({
  open,
  onClose,
  entries,
  customers,
  dateFilter,
  customStartDate,
  customEndDate,
}: FundExportModalProps) {
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const customerOptions = useMemo(
    () => customers.map(customer => ({ value: customer.id, label: customer.name })),
    [customers],
  );

  const selectedCustomer = customers.find(customer => customer.id === selectedCustomerId);

  const dateRange = useMemo(
    () => resolveDateFilterRange(dateFilter, customStartDate, customEndDate),
    [dateFilter, customStartDate, customEndDate],
  );

  const ledger = useMemo(() => {
    if (!selectedCustomerId) return [];
    return buildFundExportLedger({
      entries,
      customers,
      selectedCustomerId,
      dateRange,
    });
  }, [entries, customers, selectedCustomerId, dateRange]);

  const handleExportCsv = () => {
    if (!selectedCustomer || ledger.length === 0) return;

    const safeName = selectedCustomer.name.replace(/[^\w\-]+/g, '_').slice(0, 40);
    downloadCsv(
      `fund_ledger_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`,
      ledger.map(row => ({
        DATE: formatFundExportDate(row.date),
        TYPE: row.txnType,
        COUNTERPARTY: row.counterparty,
        DESCRIPTION: row.description,
        AMOUNT: row.walletAmount != null ? row.walletAmount : '',
        CURRENCY: row.walletAmount != null ? row.walletCurrency : '',
        'DEBIT (USDT)': row.debit > 0 ? row.debit : '',
        'CREDIT (USDT)': row.credit > 0 ? row.credit : '',
        'BALANCE (USDT)': row.balance,
      })),
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export Fund Ledger"
      maxWidth="max-w-7xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={btnPrimary}
            onClick={handleExportCsv}
            disabled={!selectedCustomerId || ledger.length === 0}
          >
            Download CSV
          </button>
        </>
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500">
            Choose a customer to preview their ledger. Other party names are shown as &ldquo;Entity&rdquo; in the export.
          </p>
        </div>
        <div className="w-full sm:w-72">
          <label className="mb-1 block text-xs font-semibold text-slate-500">Customer</label>
          <SearchableSelect
            options={customerOptions}
            value={selectedCustomerId}
            onChange={setSelectedCustomerId}
            placeholder="Select customer..."
          />
        </div>
      </div>

      {selectedCustomer ? (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-sm font-bold text-slate-900">{selectedCustomer.name}</p>
          <p className="text-xs text-slate-500">
            {ledger.length} record{ledger.length === 1 ? '' : 's'}
            {ledger.length > 0 && (
              <> · Closing balance {fmtAmount(ledger[ledger.length - 1]?.balance ?? 0)} USDT</>
            )}
          </p>
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          Select a customer to preview their report.
        </div>
      )}

      {selectedCustomerId ? <PreviewTable rows={ledger} /> : null}
    </Modal>
  );
}
