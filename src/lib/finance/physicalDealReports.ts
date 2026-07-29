import { roundTo14 } from '@/lib/physicalCalculations';
import { physicalPaymentLabel } from '@/lib/physical/paymentLabel';
import { formatDate } from '@/data/mockData';
import type {
  PhysicalBuy,
  PhysicalSell,
  PhysicalBulkSell,
  FundEntityLedgerEntry,
} from '@/types';
import {
  inRange,
  txnNo,
  withSlNo,
  type FinanceDateRange,
  type ReportColumn,
  type ReportDef,
  type ReportRow,
} from './reportShared';

export type { FinanceDateRange, ReportColumn, ReportRow } from './reportShared';
export { matchesReportSearch } from './reportShared';

export function isFixedDeal(buy: PhysicalBuy): boolean {
  if (buy.fixOrUnfix) return buy.fixOrUnfix === 'fixed';
  return buy.deal != null && buy.deal > 0;
}

function isFixedSell(sell: PhysicalSell, buy?: PhysicalBuy): boolean {
  if (buy) return isFixedDeal(buy);
  return sell.deal != null && sell.deal > 0;
}

function isFixedBulkSell(sell: PhysicalBulkSell): boolean {
  return sell.idrRate != null && sell.idrRate > 0;
}

function metalType(row: { item?: string; particulars?: string }): string {
  return row.item?.trim() || row.particulars?.trim() || 'Gold';
}

function sku(row: { productId?: string; item?: string; particulars?: string }): string {
  return row.productId || row.item || row.particulars || '—';
}

function paymentStatus(mode?: string): string {
  return mode ? 'Paid' : 'Pending';
}

function primaryCurrency(row: {
  aedAmount?: number;
  usdAmount?: number;
  idrAmount?: number;
  totalUsdt?: number;
}): { currency: string; amount: number; rate: number } {
  if (row.aedAmount && row.aedAmount > 0) return { currency: 'AED', amount: row.aedAmount, rate: 1 };
  if (row.usdAmount && row.usdAmount > 0) return { currency: 'USD', amount: row.usdAmount, rate: 1 };
  if (row.totalUsdt && row.totalUsdt > 0) return { currency: 'USDT', amount: row.totalUsdt, rate: 1 };
  if (row.idrAmount && row.idrAmount > 0) return { currency: 'IDR', amount: row.idrAmount, rate: row.idrAmount };
  return { currency: 'AED', amount: 0, rate: 0 };
}

export function buildUnfixedSalesReport(
  buys: PhysicalBuy[],
  sells: PhysicalSell[],
  bulkSells: PhysicalBulkSell[],
  range: FinanceDateRange,
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const buyMap = new Map(buys.map(b => [b.id, b]));
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'transactionNo', label: 'Transaction No.' },
    { key: 'customerId', label: 'Customer ID' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'metalType', label: 'Metal Type' },
    { key: 'purity', label: 'Purity', align: 'right' },
    { key: 'quantity', label: 'Quantity', align: 'right' },
    { key: 'rateType', label: 'Rate Type' },
    { key: 'currentMarketRate', label: 'Current Market Rate', align: 'right' },
    { key: 'estimatedValue', label: 'Estimated Value', align: 'right' },
    { key: 'status', label: 'Status' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const sellRows: ReportRow[] = sells
    .filter(s => {
      const buy = buyMap.get(s.buyId);
      return buy && !isFixedDeal(buy) && inRange(s.date, range);
    })
    .map(s => {
      const buy = buyMap.get(s.buyId)!;
      return {
        transactionNo: s.txnId ?? txnNo(s.id, 'S-'),
        date: formatDate(s.date),
        customerId: s.customerId ?? buy.customerId ?? '—',
        customerName: s.customerName ?? buy.customerName ?? '—',
        sku: sku(s),
        metalType: metalType(s),
        purity: s.purity ?? s.actualPurity ?? buy.purity ?? '—',
        quantity: roundTo14(s.pureGram).toFixed(3),
        rateType: 'Unfixed',
        currentMarketRate: s.marketUsd?.toFixed(2) ?? s.idrRate?.toFixed(2) ?? '—',
        estimatedValue: roundTo14(s.sellValue).toFixed(2),
        status: buy.status,
        remarks: s.notes ?? s.narration ?? '—',
      };
    });

  const bulkRows: ReportRow[] = bulkSells
    .filter(b => !isFixedBulkSell(b) && inRange(b.date, range))
    .map(b => ({
      transactionNo: b.txnId ?? txnNo(b.id, 'BS-'),
      date: formatDate(b.date),
      customerId: b.customerId ?? '—',
      customerName: b.customerName ?? '—',
      sku: sku(b),
      metalType: metalType(b),
      purity: '—',
      quantity: roundTo14(b.pureGram).toFixed(3),
      rateType: 'Unfixed',
      currentMarketRate: b.idrRate?.toFixed(2) ?? '—',
      estimatedValue: roundTo14(b.sellValue).toFixed(2),
      status: 'active',
      remarks: b.notes ?? b.narration ?? '—',
    }));

  return { columns, rows: withSlNo([...sellRows, ...bulkRows]) };
}

export function buildFixedSalesReport(
  buys: PhysicalBuy[],
  sells: PhysicalSell[],
  bulkSells: PhysicalBulkSell[],
  range: FinanceDateRange,
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const buyMap = new Map(buys.map(b => [b.id, b]));
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'invoiceNo', label: 'Invoice No.' },
    { key: 'customerId', label: 'Customer ID' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'metalType', label: 'Metal Type' },
    { key: 'purity', label: 'Purity', align: 'right' },
    { key: 'quantity', label: 'Quantity', align: 'right' },
    { key: 'fixedRate', label: 'Fixed Rate', align: 'right' },
    { key: 'totalAmount', label: 'Total Amount', align: 'right' },
    { key: 'currency', label: 'Currency' },
    { key: 'paymentStatus', label: 'Payment Status' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const sellRows: ReportRow[] = sells
    .filter(s => {
      const buy = buyMap.get(s.buyId);
      return buy && isFixedDeal(buy) && inRange(s.date, range);
    })
    .map(s => {
      const buy = buyMap.get(s.buyId)!;
      const cur = primaryCurrency(s);
      return {
        invoiceNo: s.txnId ?? txnNo(s.id, 'S-'),
        date: formatDate(s.date),
        customerId: s.customerId ?? buy.customerId ?? '—',
        customerName: s.customerName ?? buy.customerName ?? '—',
        sku: sku(s),
        metalType: metalType(s),
        purity: s.purity ?? s.actualPurity ?? buy.purity ?? '—',
        quantity: roundTo14(s.pureGram).toFixed(3),
        fixedRate: (s.deal ?? buy.deal ?? s.idrRate)?.toFixed(2) ?? '—',
        totalAmount: roundTo14(s.sellValue).toFixed(2),
        currency: cur.currency,
        paymentStatus: paymentStatus(s.paymentMode),
        remarks: s.notes ?? s.narration ?? '—',
      };
    });

  const bulkRows: ReportRow[] = bulkSells
    .filter(b => isFixedBulkSell(b) && inRange(b.date, range))
    .map(b => {
      const cur = primaryCurrency(b);
      return {
        invoiceNo: b.txnId ?? txnNo(b.id, 'BS-'),
        date: formatDate(b.date),
        customerId: b.customerId ?? '—',
        customerName: b.customerName ?? '—',
        sku: sku(b),
        metalType: metalType(b),
        purity: '—',
        quantity: roundTo14(b.pureGram).toFixed(3),
        fixedRate: b.idrRate?.toFixed(2) ?? '—',
        totalAmount: roundTo14(b.sellValue).toFixed(2),
        currency: cur.currency,
        paymentStatus: paymentStatus(b.paymentMode),
        remarks: b.notes ?? b.narration ?? '—',
      };
    });

  return { columns, rows: withSlNo([...sellRows, ...bulkRows]) };
}

export function buildUnfixedPurchaseReport(
  buys: PhysicalBuy[],
  range: FinanceDateRange,
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'purchaseNo', label: 'Purchase No.' },
    { key: 'supplierId', label: 'Supplier ID' },
    { key: 'supplierName', label: 'Supplier Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'metalType', label: 'Metal Type' },
    { key: 'purity', label: 'Purity', align: 'right' },
    { key: 'quantity', label: 'Quantity', align: 'right' },
    { key: 'rateType', label: 'Rate Type' },
    { key: 'currentMarketRate', label: 'Current Market Rate', align: 'right' },
    { key: 'estimatedValue', label: 'Estimated Value', align: 'right' },
    { key: 'status', label: 'Status' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const rows = buys
    .filter(b => !isFixedDeal(b) && inRange(b.date, range))
    .map(b => ({
      purchaseNo: b.txnId ?? txnNo(b.id, 'P-'),
      date: formatDate(b.date),
      supplierId: b.customerId ?? '—',
      supplierName: b.customerName ?? b.particulars ?? '—',
      sku: sku(b),
      metalType: metalType(b),
      purity: b.purity ?? b.actualPurity ?? '—',
      quantity: roundTo14(b.pureGram).toFixed(3),
      rateType: 'Unfixed',
      currentMarketRate: b.marketUsd?.toFixed(2) ?? b.idrRate?.toFixed(2) ?? '—',
      estimatedValue: roundTo14(b.buyValue).toFixed(2),
      status: b.status,
      remarks: b.notes ?? '—',
    }));

  return { columns, rows: withSlNo(rows) };
}

export function buildFixedPurchaseReport(
  buys: PhysicalBuy[],
  range: FinanceDateRange,
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'purchaseInvoiceNo', label: 'Purchase Invoice No.' },
    { key: 'supplierId', label: 'Supplier ID' },
    { key: 'supplierName', label: 'Supplier Name' },
    { key: 'sku', label: 'SKU' },
    { key: 'metalType', label: 'Metal Type' },
    { key: 'purity', label: 'Purity', align: 'right' },
    { key: 'quantity', label: 'Quantity', align: 'right' },
    { key: 'fixedRate', label: 'Fixed Rate', align: 'right' },
    { key: 'totalAmount', label: 'Total Amount', align: 'right' },
    { key: 'currency', label: 'Currency' },
    { key: 'paymentStatus', label: 'Payment Status' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const rows = buys
    .filter(b => isFixedDeal(b) && inRange(b.date, range))
    .map(b => {
      const cur = primaryCurrency(b);
      return {
        purchaseInvoiceNo: b.txnId ?? txnNo(b.id, 'P-'),
        date: formatDate(b.date),
        supplierId: b.customerId ?? '—',
        supplierName: b.customerName ?? b.particulars ?? '—',
        sku: sku(b),
        metalType: metalType(b),
        purity: b.purity ?? b.actualPurity ?? '—',
        quantity: roundTo14(b.pureGram).toFixed(3),
        fixedRate: (b.deal ?? b.idrRate)?.toFixed(2) ?? '—',
        totalAmount: roundTo14(b.buyValue).toFixed(2),
        currency: cur.currency,
        paymentStatus: paymentStatus(b.paymentMode),
        remarks: b.notes ?? '—',
      };
    });

  return { columns, rows: withSlNo(rows) };
}

export function buildMetalReceiptsReport(
  buys: PhysicalBuy[],
  branchName: string,
  range: FinanceDateRange,
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'receiptNo', label: 'Receipt No.' },
    { key: 'customerSupplier', label: 'Customer/Supplier' },
    { key: 'transactionType', label: 'Transaction Type' },
    { key: 'sku', label: 'SKU' },
    { key: 'metalType', label: 'Metal Type' },
    { key: 'purity', label: 'Purity', align: 'right' },
    { key: 'quantityReceived', label: 'Quantity Received', align: 'right' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'referenceNo', label: 'Reference No.' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const rows = buys
    .filter(b => inRange(b.date, range))
    .map(b => ({
      receiptNo: b.txnId ?? txnNo(b.id, 'MR-'),
      date: formatDate(b.date),
      customerSupplier: b.customerName ?? b.particulars ?? '—',
      transactionType: 'Purchase',
      sku: sku(b),
      metalType: metalType(b),
      purity: b.purity ?? b.actualPurity ?? '—',
      quantityReceived: roundTo14(b.pureGram).toFixed(3),
      warehouse: branchName,
      referenceNo: b.txnId ?? txnNo(b.id, 'P-'),
      remarks: b.notes ?? '—',
    }));

  return { columns, rows: withSlNo(rows) };
}

export function buildMetalPaymentsReport(
  buys: PhysicalBuy[],
  sells: PhysicalSell[],
  bulkSells: PhysicalBulkSell[],
  branchName: string,
  range: FinanceDateRange,
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const buyMap = new Map(buys.map(b => [b.id, b]));
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'paymentNo', label: 'Payment No.' },
    { key: 'customerSupplier', label: 'Customer/Supplier' },
    { key: 'transactionType', label: 'Transaction Type' },
    { key: 'sku', label: 'SKU' },
    { key: 'metalType', label: 'Metal Type' },
    { key: 'purity', label: 'Purity', align: 'right' },
    { key: 'quantityPaid', label: 'Quantity Paid', align: 'right' },
    { key: 'warehouse', label: 'Warehouse' },
    { key: 'referenceNo', label: 'Reference No.' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const sellRows = sells
    .filter(s => buyMap.has(s.buyId) && inRange(s.date, range))
    .map(s => {
      const buy = buyMap.get(s.buyId)!;
      return {
        paymentNo: s.txnId ?? txnNo(s.id, 'MP-'),
        date: formatDate(s.date),
        customerSupplier: s.customerName ?? buy.customerName ?? '—',
        transactionType: 'Sale',
        sku: sku(s),
        metalType: metalType(s),
        purity: s.purity ?? s.actualPurity ?? buy.purity ?? '—',
        quantityPaid: roundTo14(s.pureGram).toFixed(3),
        warehouse: branchName,
        referenceNo: s.txnId ?? txnNo(s.id, 'S-'),
        remarks: s.notes ?? s.narration ?? '—',
      };
    });

  const bulkRows = bulkSells
    .filter(b => inRange(b.date, range))
    .map(b => ({
      paymentNo: b.txnId ?? txnNo(b.id, 'MP-'),
      date: formatDate(b.date),
      customerSupplier: b.customerName ?? '—',
      transactionType: 'Bulk Sale',
      sku: sku(b),
      metalType: metalType(b),
      purity: '—',
      quantityPaid: roundTo14(b.pureGram).toFixed(3),
      warehouse: branchName,
      referenceNo: b.txnId ?? txnNo(b.id, 'BS-'),
      remarks: b.notes ?? b.narration ?? '—',
    }));

  return { columns, rows: withSlNo([...sellRows, ...bulkRows]) };
}

export function buildCurrencyReceiptsReport(
  sells: PhysicalSell[],
  bulkSells: PhysicalBulkSell[],
  buys: PhysicalBuy[],
  range: FinanceDateRange,
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const buyMap = new Map(buys.map(b => [b.id, b]));
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'receiptNo', label: 'Receipt No.' },
    { key: 'customer', label: 'Customer' },
    { key: 'currency', label: 'Currency' },
    { key: 'exchangeRate', label: 'Exchange Rate', align: 'right' },
    { key: 'amount', label: 'Amount', align: 'right' },
    { key: 'paymentMethod', label: 'Payment Method' },
    { key: 'referenceNo', label: 'Reference No.' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const toRow = (
    id: string,
    date: string,
    customer: string,
    txnId: string | undefined,
    paymentMode: string | undefined,
    amounts: { aedAmount?: number; usdAmount?: number; idrAmount?: number; totalUsdt?: number },
    sellValue: number,
    idrRate: number,
    notes?: string,
  ): ReportRow => {
    const cur = primaryCurrency({ ...amounts, totalUsdt: amounts.totalUsdt });
    const amount = cur.amount > 0 ? cur.amount : sellValue;
    return {
      receiptNo: txnId ?? txnNo(id, 'CR-'),
      date: formatDate(date),
      customer,
      currency: cur.currency,
      exchangeRate: idrRate?.toFixed(2) ?? '—',
      amount: roundTo14(amount).toFixed(2),
      paymentMethod: physicalPaymentLabel(paymentMode),
      referenceNo: txnId ?? txnNo(id),
      remarks: notes ?? '—',
    };
  };

  const sellRows = sells
    .filter(s => buyMap.has(s.buyId) && inRange(s.date, range))
    .map(s => {
      const buy = buyMap.get(s.buyId)!;
      return toRow(
        s.id,
        s.date,
        s.customerName ?? buy.customerName ?? '—',
        s.txnId,
        s.paymentMode,
        s,
        s.sellValue,
        s.idrRate,
        s.notes ?? s.narration,
      );
    });

  const bulkRows = bulkSells
    .filter(b => inRange(b.date, range))
    .map(b =>
      toRow(
        b.id,
        b.date,
        b.customerName ?? '—',
        b.txnId,
        b.paymentMode,
        b,
        b.sellValue,
        b.idrRate,
        b.notes ?? b.narration,
      ),
    );

  return { columns, rows: withSlNo([...sellRows, ...bulkRows]) };
}

export function buildCurrencyPaymentsReport(
  buys: PhysicalBuy[],
  range: FinanceDateRange,
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'paymentNo', label: 'Payment No.' },
    { key: 'supplier', label: 'Supplier' },
    { key: 'currency', label: 'Currency' },
    { key: 'exchangeRate', label: 'Exchange Rate', align: 'right' },
    { key: 'amount', label: 'Amount', align: 'right' },
    { key: 'paymentMethod', label: 'Payment Method' },
    { key: 'referenceNo', label: 'Reference No.' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const rows = buys
    .filter(b => inRange(b.date, range))
    .map(b => {
      const cur = primaryCurrency(b);
      const amount = cur.amount > 0 ? cur.amount : b.buyValue;
      return {
        paymentNo: b.txnId ?? txnNo(b.id, 'CP-'),
        date: formatDate(b.date),
        supplier: b.customerName ?? b.particulars ?? '—',
        currency: cur.currency,
        exchangeRate: b.idrRate?.toFixed(2) ?? '—',
        amount: roundTo14(amount).toFixed(2),
        paymentMethod: physicalPaymentLabel(b.paymentMode),
        referenceNo: b.txnId ?? txnNo(b.id, 'P-'),
        remarks: b.notes ?? '—',
      };
    });

  return { columns, rows: withSlNo(rows) };
}

export function buildJournalEntriesReport(
  entries: FundEntityLedgerEntry[],
  range: FinanceDateRange,
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'journalNo', label: 'Journal No.' },
    { key: 'voucherType', label: 'Voucher Type' },
    { key: 'accountCode', label: 'Account Code' },
    { key: 'accountName', label: 'Account Name' },
    { key: 'debit', label: 'Debit', align: 'right' },
    { key: 'credit', label: 'Credit', align: 'right' },
    { key: 'narration', label: 'Narration' },
    { key: 'postedBy', label: 'Posted By' },
    { key: 'status', label: 'Status' },
  ];

  const physicalTypes = new Set(['physical_buy', 'physical_sell']);
  const rows = entries
    .filter(e => physicalTypes.has(e.referenceType) && inRange(e.entryDate, range))
    .map(e => ({
      journalNo: txnNo(e.id, 'J-'),
      date: formatDate(e.entryDate),
      voucherType: e.referenceType.replace(/_/g, ' '),
      accountCode: e.customerId,
      accountName: e.description.split('—')[0]?.trim() || e.customerId,
      debit: e.debit.toFixed(2),
      credit: e.credit.toFixed(2),
      narration: e.description,
      postedBy: e.createdByName ?? e.createdBy ?? '—',
      status: 'Posted',
    }));

  return { columns, rows: withSlNo(rows) };
}

export function buildGeneralJournalVoucherReport(
  entries: FundEntityLedgerEntry[],
  range: FinanceDateRange,
): { columns: ReportColumn[]; rows: ReportRow[] } {
  const columns: ReportColumn[] = [
    { key: 'slNo', label: 'Sl. No.' },
    { key: 'date', label: 'Date' },
    { key: 'voucherNo', label: 'Voucher No.' },
    { key: 'voucherType', label: 'Voucher Type' },
    { key: 'accountCode', label: 'Account Code' },
    { key: 'accountName', label: 'Account Name' },
    { key: 'debit', label: 'Debit', align: 'right' },
    { key: 'credit', label: 'Credit', align: 'right' },
    { key: 'narration', label: 'Narration' },
    { key: 'approvedBy', label: 'Approved By' },
    { key: 'status', label: 'Status' },
  ];

  const rows = entries
    .filter(e => e.referenceType === 'manual' && inRange(e.entryDate, range))
    .map(e => ({
      voucherNo: txnNo(e.id, 'GV-'),
      date: formatDate(e.entryDate),
      voucherType: 'General Journal',
      accountCode: e.customerId,
      accountName: e.description.split('—')[0]?.trim() || e.customerId,
      debit: e.debit.toFixed(2),
      credit: e.credit.toFixed(2),
      narration: e.description,
      approvedBy: e.createdByName ?? e.createdBy ?? '—',
      status: 'Posted',
    }));

  return { columns, rows: withSlNo(rows) };
}

export function getPhysicalDealReportDefs(input: {
  buys: PhysicalBuy[];
  sells: PhysicalSell[];
  bulkSells: PhysicalBulkSell[];
  ledgerEntries: FundEntityLedgerEntry[];
  branchName: string;
  range: FinanceDateRange;
}): ReportDef[] {
  const { buys, sells, bulkSells, ledgerEntries, branchName, range } = input;
  const buyIds = new Set(buys.map(b => b.id));
  const scopedSells = sells.filter(s => buyIds.has(s.buyId));

  return [
    {
      id: 'unfixed-sales',
      title: 'Unfixed Sales Report',
      subtitle: 'Sales from open-rate positions',
      info: 'Sales linked to unfixed purchases or bulk sells without locked rate.',
      available: true,
      build: () => buildUnfixedSalesReport(buys, scopedSells, bulkSells, range),
    },
    {
      id: 'fixed-sales',
      title: 'Fixed Sales Report',
      subtitle: 'Sales with locked rates',
      info: 'Sales from fixed-rate purchase positions. Totals grouped by currency.',
      currencyColumn: 'currency',
      available: true,
      build: () => buildFixedSalesReport(buys, scopedSells, bulkSells, range),
    },
    {
      id: 'unfixed-purchase',
      title: 'Unfixed Purchase Report',
      subtitle: 'Purchases at open market rate',
      info: 'Gold purchases without a locked deal rate.',
      available: true,
      build: () => buildUnfixedPurchaseReport(buys, range),
    },
    {
      id: 'fixed-purchase',
      title: 'Fixed Purchase Report',
      subtitle: 'Purchases with locked rates',
      info: 'Purchases with fixed deal rate. Totals grouped by currency.',
      currencyColumn: 'currency',
      available: true,
      build: () => buildFixedPurchaseReport(buys, range),
    },
    {
      id: 'metal-purchase-return',
      title: 'Metal Purchase Return Report',
      subtitle: 'Returns to suppliers',
      info: 'Requires return transaction records.',
      available: false,
      unavailableReason: 'Return transactions not tracked in current schema',
      build: () => ({ columns: [], rows: [] }),
    },
    {
      id: 'metal-sales-return',
      title: 'Metal Sales Return Report',
      subtitle: 'Customer returns',
      info: 'Requires return transaction records.',
      available: false,
      unavailableReason: 'Return transactions not tracked in current schema',
      build: () => ({ columns: [], rows: [] }),
    },
    {
      id: 'metal-receipts',
      title: 'Metal Receipts Report',
      subtitle: 'Physical metal received (purchases)',
      info: 'Physical gold received into branch inventory via purchases.',
      available: true,
      build: () => buildMetalReceiptsReport(buys, branchName, range),
    },
    {
      id: 'metal-payments',
      title: 'Metal Payments Report',
      subtitle: 'Physical metal paid out (sales)',
      info: 'Physical gold delivered to customers via sales and bulk sells.',
      available: true,
      build: () => buildMetalPaymentsReport(buys, scopedSells, bulkSells, branchName, range),
    },
    {
      id: 'currency-receipts',
      title: 'Currency Receipts Report',
      subtitle: 'Cash received on sales',
      info: 'Payment received on sales. Totals grouped by currency.',
      currencyColumn: 'currency',
      available: true,
      build: () => buildCurrencyReceiptsReport(scopedSells, bulkSells, buys, range),
    },
    {
      id: 'currency-payments',
      title: 'Currency Payments Report',
      subtitle: 'Cash paid on purchases',
      info: 'Payment made on purchases. Totals grouped by currency.',
      currencyColumn: 'currency',
      available: true,
      build: () => buildCurrencyPaymentsReport(buys, range),
    },
    {
      id: 'journal-entries',
      title: 'Journal Entries Report',
      subtitle: 'Ledger entries linked to physical deals',
      info: 'Fund ledger entries with physical_buy or physical_sell reference.',
      available: true,
      build: () => buildJournalEntriesReport(ledgerEntries, range),
    },
    {
      id: 'general-journal-voucher',
      title: 'General Journal Voucher Report',
      subtitle: 'Manual journal vouchers',
      info: 'Manual journal entries from the entity ledger.',
      available: true,
      build: () => buildGeneralJournalVoucherReport(ledgerEntries, range),
    },
  ];
}
