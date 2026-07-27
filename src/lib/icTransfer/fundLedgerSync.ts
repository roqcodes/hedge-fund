import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { computeICSaleAmounts } from '@/lib/icTransfer/rateCalculations';
import { normalizeOrderStatus } from '@/lib/icTransfer/orderStatus';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import { mapICSaleRow, mapICPurchaseRow } from '@/lib/icTransferMappers';
import { computeCustomerAverageUsdtRate } from '@/lib/fundLedgerCurrency';
import {
  deleteAutoLedgerEntryByReference,
  insertAutoFundLedgerEntry,
} from '@/app/actions/fundActions';
import { roundTo14 } from '@/lib/physicalCalculations';
import type { FundEntityLedgerEntry, ICSale } from '@/types';

type LedgerAmounts = {
  amount: number;
  inputSide: 'usdt' | 'customer';
  customerCurrency: string;
  customerCurrencyRate?: number;
  settlementCurrency: string;
};

function mapLedgerRow(row: Record<string, unknown>): FundEntityLedgerEntry {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    customerId: String(row.customer_id),
    entryDate: String(row.entry_date),
    description: String(row.description ?? ''),
    debit: Number(row.debit) || 0,
    credit: Number(row.credit) || 0,
    referenceType: (row.reference_type as FundEntityLedgerEntry['referenceType']) ?? 'manual',
    referenceId: row.reference_id ? String(row.reference_id) : undefined,
    customerCurrency: row.customer_currency ? String(row.customer_currency) : undefined,
    customerCurrencyRate:
      row.customer_currency_rate != null ? Number(row.customer_currency_rate) : undefined,
    settlementCurrency: row.settlement_currency ? String(row.settlement_currency) : undefined,
    settlementAmount: row.settlement_amount != null ? Number(row.settlement_amount) : undefined,
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
  };
}

async function loadCustomerLedgerEntries(
  branchId: string,
  customerId: string,
): Promise<FundEntityLedgerEntry[]> {
  const res = await query(
    `SELECT * FROM fund_entity_ledger
     WHERE branch_id = $1 AND customer_id = $2
     ORDER BY entry_date DESC
     LIMIT 500`,
    [branchId, customerId],
  );
  return res.rows.map(r => mapLedgerRow(r as Record<string, unknown>));
}

async function resolveBranchIdForSale(sale: ICSale): Promise<string | null> {
  if (sale.orderCustomerId) {
    const res = await query(
      `SELECT branch_id FROM customers WHERE id = $1 LIMIT 1`,
      [sale.orderCustomerId],
    );
    if (res.rows.length > 0) return String(res.rows[0].branch_id);
  }

  if (sale.warehouseId) {
    const res = await query(
      `SELECT branch_id FROM ic_warehouses WHERE id = $1 LIMIT 1`,
      [sale.warehouseId],
    );
    if (res.rows[0]?.branch_id) return String(res.rows[0].branch_id);
  }

  const customerName = sale.customerName?.trim();
  if (customerName) {
    const branchRes = await query(
      `SELECT id FROM branches WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
      [customerName],
    );
    if (branchRes.rows.length > 0) return String(branchRes.rows[0].id);

    const custRes = await query(
      `SELECT branch_id FROM customers WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) LIMIT 1`,
      [customerName],
    );
    if (custRes.rows.length > 0) return String(custRes.rows[0].branch_id);
  }

  return null;
}

async function resolveBranchIdForPurchase(purchaseId: string): Promise<string | null> {
  const res = await query(
    `SELECT w.branch_id, s.branch_id AS supplier_branch_id
     FROM ic_purchases p
     LEFT JOIN ic_warehouses w ON w.id = p.warehouse_id
     LEFT JOIN ic_suppliers s ON s.id = p.supplier_id
     WHERE p.id = $1
     LIMIT 1`,
    [purchaseId],
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  if (row.branch_id) return String(row.branch_id);
  if (row.supplier_branch_id) return String(row.supplier_branch_id);
  return null;
}

async function resolveCustomerIdForSale(
  sale: ICSale,
  branchId: string,
): Promise<string | null> {
  if (sale.orderCustomerId) {
    const res = await query(
      `SELECT id FROM customers WHERE id = $1 AND branch_id = $2 LIMIT 1`,
      [sale.orderCustomerId, branchId],
    );
    if (res.rows.length > 0) return String(res.rows[0].id);
  }

  const branchRes = await query(`SELECT name FROM branches WHERE id = $1 LIMIT 1`, [branchId]);
  const branchName = branchRes.rows[0]?.name ? String(branchRes.rows[0].name) : '';

  const candidateName = sale.orderCustomerName?.trim() || sale.customerName?.trim();
  if (!candidateName) return null;

  if (branchName && candidateName.toLowerCase() === branchName.toLowerCase()) {
    return null;
  }

  const custRes = await query(
    `SELECT id FROM customers
     WHERE branch_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))
     LIMIT 1`,
    [branchId, candidateName],
  );
  if (custRes.rows.length > 0) return String(custRes.rows[0].id);

  return null;
}

async function resolveCustomerIdForSupplier(
  supplierId: string | undefined | null,
  branchId: string,
): Promise<string | null> {
  if (!supplierId) return null;

  const supplierRes = await query(
    `SELECT name FROM ic_suppliers WHERE id = $1 LIMIT 1`,
    [supplierId],
  );
  if (supplierRes.rows.length === 0) return null;
  const supplierName = String(supplierRes.rows[0].name || '').trim();
  if (!supplierName) return null;

  const custRes = await query(
    `SELECT id FROM customers
     WHERE branch_id = $1 AND LOWER(TRIM(name)) = LOWER(TRIM($2))
     LIMIT 1`,
    [branchId, supplierName],
  );
  if (custRes.rows.length === 0) return null;
  return String(custRes.rows[0].id);
}

function computeSaleFinancials(sale: ICSale) {
  const units = sale.units || 0;
  const unitRate = sale.unitRate || 0;
  const serviceCharge = sale.serviceCharge || 0;
  const conversionRate = sale.conversionRate ?? 1;
  const computed = computeICSaleAmounts(units, unitRate, conversionRate, serviceCharge);

  return {
    aedAmount: sale.aedAmount ?? computed.aedNetTotal,
    convertedAmount: sale.convertedAmount ?? computed.currencyTotal,
    orderCurrency: (sale.currency || 'AED').toUpperCase(),
  };
}

function computePurchaseFinancials(purchase: {
  units: number;
  unitRate: number;
  convertedTotal?: number;
  aedTotal?: number;
}) {
  const aedTotal = purchase.aedTotal ?? roundTo14(purchase.units * purchase.unitRate);
  const convertedTotal = purchase.convertedTotal ?? aedTotal;
  return { aedTotal, convertedTotal };
}

async function resolveLedgerAmounts(
  branchId: string,
  customerId: string,
  profileCurrency: string,
  aedAmount: number,
  convertedAmount: number,
  orderCurrency: string,
): Promise<LedgerAmounts | null> {
  const normalizedProfile = (profileCurrency || 'USDT').toUpperCase();
  const bookCurrency =
    normalizedProfile === 'USDT'
      ? orderCurrency
      : normalizedProfile;

  let customerAmount = aedAmount;
  if (bookCurrency === 'IDR') {
    customerAmount = orderCurrency === 'IDR' ? convertedAmount : aedAmount;
  } else if (bookCurrency === 'AED') {
    customerAmount = aedAmount;
  } else if (bookCurrency === 'USDT') {
    customerAmount = aedAmount;
  } else {
    customerAmount = orderCurrency === bookCurrency ? convertedAmount : aedAmount;
  }

  if (!customerAmount || customerAmount <= 0) return null;

  if (normalizedProfile === 'USDT') {
    return {
      amount: roundTo14(customerAmount),
      inputSide: 'usdt',
      customerCurrency: 'USDT',
      customerCurrencyRate: 1,
      settlementCurrency: 'USDT',
    };
  }

  const entries = await loadCustomerLedgerEntries(branchId, customerId);
  const avgRate = computeCustomerAverageUsdtRate(entries, customerId, normalizedProfile);

  if (avgRate?.rate && avgRate.rate > 0) {
    return {
      amount: roundTo14(customerAmount),
      inputSide: 'customer',
      customerCurrency: normalizedProfile,
      customerCurrencyRate: avgRate.rate,
      settlementCurrency: normalizedProfile,
    };
  }

  // Pending conversion — book provisional USDT until user sets rate on Funds page.
  return {
    amount: roundTo14(customerAmount),
    inputSide: 'usdt',
    customerCurrency: 'USDT',
    settlementCurrency: 'USDT',
  };
}

function buildSaleDescription(sale: ICSale): string {
  const txnId = getFormattedTxnId(sale.id, 'sale', sale);
  const parts = [
    `IC sale ${txnId}`,
    `${sale.units} units @ ${sale.unitRate}`,
  ];
  if (sale.transactionType) parts.push(sale.transactionType.replace(/_/g, ' '));
  if (sale.aedAmount != null) parts.push(`AED ${sale.aedAmount.toFixed(2)}`);
  if (sale.currency && sale.convertedAmount != null && sale.currency !== 'AED') {
    parts.push(`${sale.currency} ${sale.convertedAmount.toFixed(2)}`);
  }
  if (sale.orderCustomerName) parts.push(sale.orderCustomerName);
  return parts.join(' | ');
}

function buildPurchaseDescription(purchase: {
  id: string;
  units: number;
  unitRate: number;
  aedTotal?: number;
  supplierName?: string;
}): string {
  const txnId = getFormattedTxnId(purchase.id, 'purchase');
  const parts = [
    `IC purchase ${txnId}`,
    `${purchase.units} units @ ${purchase.unitRate}`,
  ];
  if (purchase.aedTotal != null) parts.push(`AED ${purchase.aedTotal.toFixed(2)}`);
  if (purchase.supplierName) parts.push(purchase.supplierName);
  return parts.join(' | ');
}

/** Post or refresh fund ledger for a completed IC sale (receivable). */
export async function syncICSaleFundLedger(saleId: string): Promise<void> {
  try {
    const saleRes = await query(
      `SELECT s.*, a.name AS delivery_agent_name
       FROM ic_sales s
       LEFT JOIN ic_delivery_agents a ON s.delivery_agent_id = a.id
       WHERE s.id = $1`,
      [saleId],
    );
    if (saleRes.rows.length === 0) return;

    const sale = mapICSaleRow(saleRes.rows[0]);
    const status = normalizeOrderStatus(sale.orderStatus);

    if (status !== 'completed') {
      await deleteAutoLedgerEntryByReference('ic_sale', saleId);
      return;
    }

    const branchId = await resolveBranchIdForSale(sale);
    if (!branchId) {
      logger.warn({ saleId }, 'IC sale fund sync skipped — branch not resolved');
      return;
    }

    const customerId = await resolveCustomerIdForSale(sale, branchId);
    if (!customerId) {
      logger.warn({ saleId, branchId }, 'IC sale fund sync skipped — no linked customer entity');
      return;
    }

    const custRes = await query(
      `SELECT currency FROM customers WHERE id = $1 AND branch_id = $2 LIMIT 1`,
      [customerId, branchId],
    );
    if (custRes.rows.length === 0) return;
    const profileCurrency = String(custRes.rows[0].currency || 'AED');

    const { aedAmount, convertedAmount, orderCurrency } = computeSaleFinancials(sale);
    const amounts = await resolveLedgerAmounts(
      branchId,
      customerId,
      profileCurrency,
      aedAmount,
      convertedAmount,
      orderCurrency,
    );
    if (!amounts) return;

    await deleteAutoLedgerEntryByReference('ic_sale', saleId);

    await insertAutoFundLedgerEntry({
      branchId,
      customerId,
      direction: 'debit',
      amount: amounts.amount,
      inputSide: amounts.inputSide,
      referenceType: 'ic_sale',
      referenceId: saleId,
      description: buildSaleDescription(sale),
      customerCurrency: amounts.customerCurrency,
      customerCurrencyRate: amounts.customerCurrencyRate,
      settlementCurrency: amounts.settlementCurrency,
      entryDate: sale.createdAt,
      createdBy: sale.enteredBy,
      createdByName: sale.enteredByName,
      createdByUserId: sale.enteredByUserId,
    });
  } catch (err) {
    logger.error({ err, saleId }, 'Failed to sync IC sale to fund ledger');
  }
}

/** Post or refresh fund ledger for an IC purchase (payable to supplier entity). */
export async function syncICPurchaseFundLedger(purchaseId: string): Promise<void> {
  try {
    const purchaseRes = await query(`SELECT * FROM ic_purchases WHERE id = $1`, [purchaseId]);
    if (purchaseRes.rows.length === 0) return;

    const purchase = mapICPurchaseRow(purchaseRes.rows[0]);
    const branchId = await resolveBranchIdForPurchase(purchaseId);
    if (!branchId) {
      logger.warn({ purchaseId }, 'IC purchase fund sync skipped — branch not resolved');
      return;
    }

    const customerId = await resolveCustomerIdForSupplier(purchase.supplierId, branchId);
    if (!customerId) {
      logger.debug(
        { purchaseId, branchId },
        'IC purchase fund sync skipped — supplier not linked to customer entity',
      );
      return;
    }

    const custRes = await query(
      `SELECT currency FROM customers WHERE id = $1 AND branch_id = $2 LIMIT 1`,
      [customerId, branchId],
    );
    if (custRes.rows.length === 0) return;
    const profileCurrency = String(custRes.rows[0].currency || 'AED');

    const { aedTotal, convertedTotal } = computePurchaseFinancials(purchase);
    const amounts = await resolveLedgerAmounts(
      branchId,
      customerId,
      profileCurrency,
      aedTotal,
      convertedTotal,
      'AED',
    );
    if (!amounts) return;

    let supplierName: string | undefined;
    if (purchase.supplierId) {
      const supRes = await query(`SELECT name FROM ic_suppliers WHERE id = $1`, [purchase.supplierId]);
      supplierName = supRes.rows[0]?.name ? String(supRes.rows[0].name) : undefined;
    }

    await deleteAutoLedgerEntryByReference('ic_purchase', purchaseId);

    await insertAutoFundLedgerEntry({
      branchId,
      customerId,
      direction: 'credit',
      amount: amounts.amount,
      inputSide: amounts.inputSide,
      referenceType: 'ic_purchase',
      referenceId: purchaseId,
      description: buildPurchaseDescription({
        id: purchase.id,
        units: purchase.units,
        unitRate: purchase.unitRate,
        aedTotal,
        supplierName,
      }),
      customerCurrency: amounts.customerCurrency,
      customerCurrencyRate: amounts.customerCurrencyRate,
      settlementCurrency: amounts.settlementCurrency,
      entryDate: purchase.createdAt,
    });
  } catch (err) {
    logger.error({ err, purchaseId }, 'Failed to sync IC purchase to fund ledger');
  }
}

export async function removeICSaleFundLedger(saleId: string): Promise<void> {
  await deleteAutoLedgerEntryByReference('ic_sale', saleId);
}

export async function removeICPurchaseFundLedger(purchaseId: string): Promise<void> {
  await deleteAutoLedgerEntryByReference('ic_purchase', purchaseId);
}
