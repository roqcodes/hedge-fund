import React, { useMemo } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import Modal from '@/components/ui/Modal';
import { PhysicalBuy, PhysicalSell } from '@/types';
import { btnPrimary, btnSecondary, tableWrap, dataTable } from '@/lib/ui';

interface PhysicalExportModalProps {
  open: boolean;
  onClose: () => void;
  buys: PhysicalBuy[];
  sells: PhysicalSell[];
  initialCapital: number;
  initialVolume: number;
}

interface LedgerRow {
  date: string;
  txnType: 'BUY' | 'SELL';
  txnId: string;
  particulars: string;
  gram: number;
  idrGram: number;
  idrToUsdt: number;
  total: number;
  sellValue: number;
  buyValue: number;
  capitalBalance: number;
  received: number;
  paid: number;
  volumeBalance: number;
  createdAt: string;
}

export default function PhysicalExportModal({
  open,
  onClose,
  buys,
  sells,
  initialCapital,
  initialVolume,
}: PhysicalExportModalProps) {
  
  const ledger = useMemo(() => {
    // 1. Filter sells to only those that belong to the provided buys
    const buyIds = new Set(buys.map(b => b.id));
    const relevantSells = sells.filter(s => buyIds.has(s.buyId));

    // 2. Combine buys and sells
    const combined: Omit<LedgerRow, 'capitalBalance' | 'volumeBalance'>[] = [];

    buys.forEach(b => {
      combined.push({
        date: b.date,
        txnType: 'BUY',
        txnId: 'BUY-' + b.id.slice(-4).toUpperCase(),
        particulars: b.particulars,
        gram: b.pureGram, // image "GRAM" column
        idrGram: b.idrGram,
        idrToUsdt: b.idrToUsdt,
        total: b.total,
        sellValue: 0,
        buyValue: b.buyValue,
        received: b.pureGram,
        paid: 0,
        createdAt: b.createdAt || b.date,
      });
    });

    relevantSells.forEach(s => {
      combined.push({
        date: s.date,
        txnType: 'SELL',
        txnId: 'SELL-' + s.id.slice(-4).toUpperCase(),
        particulars: s.particulars || 'SELL',
        gram: s.pureGram,
        idrGram: s.idrGram,
        idrToUsdt: s.idrToUsdt,
        total: s.total,
        sellValue: s.sellValue,
        buyValue: 0,
        received: 0,
        paid: s.pureGram,
        createdAt: s.createdAt || s.date,
      });
    });

    // 3. Sort chronologically
    combined.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      
      const createdA = new Date(a.createdAt).getTime();
      const createdB = new Date(b.createdAt).getTime();
      if (createdA !== createdB) return createdA - createdB;

      return a.txnType === 'BUY' ? -1 : 1; // Buys before sells on exact same time
    });

    // 4. Calculate running balances
    // For capital, initial capital is what we started with. The screenshot showed negative for buys (spending capital).
    // Let's strictly follow: Balance = prevBalance + Sell Value - Buy Value
    // If initialCapital exists, we could start there. The user image shows "STOCK VALUE -292440". This implies it tracks "Money tied up in stock" or similar.
    // If we use negative for stock value: prev - buyValue + sellValue.
    // We'll start with 0 for this export unless the user wants initialCapital. 
    // The image starts at 0 essentially, then goes negative on buy.
    
    let currentCapital = 0; // Using 0 to match screenshot behavior where first buy creates negative balance
    let currentVolume = 0; // Starting volume

    const finalLedger: LedgerRow[] = combined.map(row => {
      currentCapital = currentCapital + row.sellValue - row.buyValue;
      currentVolume = currentVolume + row.received - row.paid;

      return {
        ...row,
        capitalBalance: currentCapital,
        volumeBalance: currentVolume,
      };
    });

    return finalLedger;
  }, [buys, sells]);

  const handleExportExcel = async () => {
    if (ledger.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Physical Ledger');

    // Add first header row (STOCK VALUE / STOCK WEIGHT)
    sheet.mergeCells('A1:J1');
    const headerValue = sheet.getCell('A1');
    headerValue.value = 'STOCK VALUE';
    headerValue.alignment = { horizontal: 'center', vertical: 'middle' };
    headerValue.font = { bold: true, color: { argb: 'FF9C4221' } }; // orange-900ish
    headerValue.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } }; // orange-100

    sheet.mergeCells('K1:M1');
    const headerWeight = sheet.getCell('K1');
    headerWeight.value = 'STOCK WEIGHT';
    headerWeight.alignment = { horizontal: 'center', vertical: 'middle' };
    headerWeight.font = { bold: true, color: { argb: 'FF9C4221' } };
    headerWeight.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEDD5' } };

    // Add second header row (Column names)
    const headers = [
      'DATE', 'TXN', 'PARTICULARS', 'GRAM', 'IDR GRAM', 'IDR RATE', 'TOTAL',
      'SELL VALUE', 'BUY VALUE', 'BALANCE (AMOUNT)', 'RECEIVED', 'PAID', 'BALANCE (VOLUME)'
    ];
    
    const row2 = sheet.addRow(headers);
    row2.eachCell((cell, colNumber) => {
      cell.font = { bold: true, color: { argb: 'FF334155' } }; // slate-700
      if (colNumber === 7) { // TOTAL
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // slate-200
      }
      // Add a bottom border to separate headers
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
    });

    // Add data
    ledger.forEach((r, idx) => {
      const row = sheet.addRow([
        new Date(r.date).toLocaleDateString('en-GB').replace(/\//g, '-'),
        r.txnId,
        r.particulars,
        r.gram,
        r.idrGram,
        r.idrToUsdt,
        r.total,
        r.sellValue > 0 ? r.sellValue : null,
        r.buyValue > 0 ? r.buyValue : null,
        r.capitalBalance,
        r.received > 0 ? r.received : null,
        r.paid > 0 ? r.paid : null,
        r.volumeBalance
      ]);
      
      // Formatting numbers
      row.getCell(4).numFmt = '#,##0.000'; // GRAM
      row.getCell(5).numFmt = '#,##0'; // IDR GRAM
      row.getCell(6).numFmt = '#,##0.00'; // IDR RATE
      row.getCell(7).numFmt = '#,##0'; // TOTAL
      row.getCell(8).numFmt = '#,##0'; // SELL VALUE
      row.getCell(9).numFmt = '#,##0'; // BUY VALUE
      row.getCell(10).numFmt = '#,##0'; // BALANCE
      row.getCell(11).numFmt = '#,##0.000'; // RECEIVED
      row.getCell(12).numFmt = '#,##0.000'; // PAID
      row.getCell(13).numFmt = '#,##0.000'; // BALANCE
      
      // Keep column 7 shaded like header
      const totalCell = row.getCell(7);
      totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } }; // slate-100
      
      // Make capital balance and volume balance bold
      row.getCell(10).font = { bold: true };
      row.getCell(13).font = { bold: true };
      
      // Highlight buys slightly different from sells for readability
      if (r.txnType === 'BUY') {
        row.getCell(9).font = { bold: true, color: { argb: 'FF0369A1' } }; // sky-700
        row.getCell(11).font = { bold: true, color: { argb: 'FF15803D' } }; // green-700
      } else {
        row.getCell(8).font = { bold: true, color: { argb: 'FFB45309' } }; // amber-700
        row.getCell(12).font = { bold: true, color: { argb: 'FFBE123C' } }; // rose-700
      }
    });

    // Adjust column widths
    sheet.columns.forEach((column, i) => {
      if (i === 2) { // PARTICULARS
        column.width = 30;
      } else if (i === 1) { // TXN
        column.width = 15;
      } else if (i === 0) { // DATE
        column.width = 12;
      } else {
        column.width = 14;
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `physical_ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export Physical Ledger"
      maxWidth="max-w-7xl"
      footer={
        <>
          <button type="button" className={btnSecondary} onClick={onClose}>
            Close
          </button>
          <button type="button" className={btnPrimary} onClick={handleExportExcel}>
            Download Excel
          </button>
        </>
      }
    >
      <div className="mb-4 text-sm text-slate-500">
        Preview of the physical ledger export based on your current view.
      </div>
      
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="max-h-[75vh] overflow-auto">
          <table className="w-full min-w-[800px] text-left text-[11px] whitespace-nowrap">
            <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
              <tr>
                <th colSpan={9} className="border-b border-r border-slate-200 bg-orange-100 px-3 py-2 text-center font-bold text-orange-900">STOCK VALUE</th>
                <th colSpan={4} className="border-b border-slate-200 bg-orange-100 px-3 py-2 text-center font-bold text-orange-900">STOCK WEIGHT</th>
              </tr>
              <tr>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">DATE</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">TXN</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">PARTICULARS</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">GRAM</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">IDR GRAM</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">IDR RATE</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700 bg-slate-200/50">TOTAL</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">SELL VALUE</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">BUY VALUE</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">BALANCE (AMOUNT)</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">RECEIVED</th>
                <th className="border-b border-r border-slate-200 px-3 py-2 font-bold text-slate-700">PAID</th>
                <th className="border-b border-slate-200 px-3 py-2 font-bold text-slate-700">BALANCE (VOLUME)</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length > 0 ? (
                ledger.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-600">{new Date(row.date).toLocaleDateString('en-GB').replace(/\//g, '-')}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-600 font-medium">{row.txnId}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-900">{row.particulars}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-900 font-medium text-right">{row.gram.toFixed(3)}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-600 text-right">{row.idrGram.toLocaleString()}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-600 text-right">{row.idrToUsdt.toFixed(2)}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-600 bg-slate-50 text-right">{row.total.toFixed(0)}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-900 font-medium text-right">{row.sellValue > 0 ? row.sellValue.toFixed(0) : ''}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-900 font-medium text-right">{row.buyValue > 0 ? row.buyValue.toFixed(0) : ''}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-900 font-bold text-right">{row.capitalBalance.toFixed(0)}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-900 font-medium text-right">{row.received > 0 ? row.received.toFixed(3) : ''}</td>
                    <td className="border-b border-r border-slate-100 px-3 py-2 text-slate-900 font-medium text-right">{row.paid > 0 ? row.paid.toFixed(3) : ''}</td>
                    <td className="border-b border-slate-100 px-3 py-2 text-slate-900 font-bold text-right bg-slate-50">{row.volumeBalance.toFixed(3)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="px-3 py-8 text-center text-slate-500">
                    No records found to export.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}
