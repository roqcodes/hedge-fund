'use client';

import React from 'react';
import { btnSecondary } from '@/lib/ui';
import { downloadCsv, downloadPdfReport, buildTableHtml, type CsvRow } from '@/lib/finance/exportReports';

type ExportColumn = { key: string; label: string; align?: 'left' | 'right' };

type Props = {
  filename: string;
  pdfTitle: string;
  pdfSubtitle: string;
  columns: ExportColumn[];
  rows: CsvRow[];
  kpiItems?: { label: string; value: string }[];
};

export default function ReportExportButtons({
  filename,
  pdfTitle,
  pdfSubtitle,
  columns,
  rows,
  kpiItems,
}: Props) {
  const disabled = rows.length === 0;

  const handleCsv = () => {
    const csvRows = rows.map(row => {
      const out: CsvRow = {};
      for (const col of columns) {
        out[col.label] = row[col.key];
      }
      return out;
    });
    downloadCsv(filename, csvRows);
  };

  const handlePdf = () => {
    const kpiHtml = kpiItems?.length
      ? `<div class="kpi-grid">${kpiItems.map(i => `<div class="kpi"><div class="kpi-label">${i.label}</div><div class="kpi-value">${i.value}</div></div>`).join('')}</div>`
      : '';
    const tableHtml = buildTableHtml(columns, rows, pdfTitle);
    downloadPdfReport(pdfTitle, pdfSubtitle, kpiHtml + tableHtml);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`${btnSecondary} text-xs !py-1.5 !px-3`}
        disabled={disabled}
        onClick={handleCsv}
      >
        Export CSV
      </button>
      <button
        type="button"
        className={`${btnSecondary} text-xs !py-1.5 !px-3`}
        disabled={disabled}
        onClick={handlePdf}
      >
        Export PDF
      </button>
    </div>
  );
}
