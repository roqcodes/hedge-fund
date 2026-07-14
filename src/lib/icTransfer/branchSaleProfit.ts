import type { ICSale, ICRateGroup } from '@/types';
import { getCurrencyUnitRate } from './rateCalculations';
import { getAdminAssignedBranchRateGroup, resolveBranchCustomerOrderRate } from './branchRateScope';
import { isBranchHandledSale } from './fulfillmentHandler';
import { normalizeOrderStatus } from './orderStatus';

/** Profit in order currency: (units × admin rate) − (units × branch rate). */
export function computeBranchSaleProfit(
  units: number,
  adminSaleRateAed: number,
  branchSaleRateAed: number,
  adminConversionRate: number,
  branchConversionRate: number,
): number {
  const adminCurrencyRate = getCurrencyUnitRate(adminSaleRateAed, adminConversionRate);
  const branchCurrencyRate = getCurrencyUnitRate(branchSaleRateAed, branchConversionRate);
  return units * (adminCurrencyRate - branchCurrencyRate);
}

export function resolveSaleBranchProfit(
  sale: ICSale,
  groups: ICRateGroup[],
  branchId: string | undefined,
): { profit: number; currency: string } | null {
  if (!branchId) return null;
  if (isBranchHandledSale(sale)) return null;
  if (normalizeOrderStatus(sale.orderStatus) !== 'completed') return null;

  const adminGroup = getAdminAssignedBranchRateGroup(groups, branchId);
  let adminSaleRate = sale.adminUnitRate ?? adminGroup?.saleRate;
  let adminConversion = sale.adminConversionRate ?? adminGroup?.conversionRate ?? 1;

  let branchSaleRate = sale.unitRate;
  let branchConversion = sale.conversionRate ?? 1;

  // Legacy orders stored the admin rate as unit_rate before branch-profit tracking.
  if (
    sale.adminUnitRate == null &&
    adminGroup &&
    sale.orderCustomerId &&
    Math.abs(sale.unitRate - adminGroup.saleRate) < 0.000001
  ) {
    const branchGroup = resolveBranchCustomerOrderRate(groups, {
      branchId,
      customerId: sale.orderCustomerId,
      branchCustomerIds: new Set(),
    });
    if (branchGroup) {
      branchSaleRate = branchGroup.saleRate;
      branchConversion = branchGroup.conversionRate ?? 1;
    }
  }

  if (adminSaleRate == null || !Number.isFinite(branchSaleRate)) return null;

  const currency = sale.currency ?? branchGroupCurrency(sale, groups, branchId) ?? 'AED';

  const profit = computeBranchSaleProfit(
    sale.units,
    adminSaleRate,
    branchSaleRate,
    adminConversion,
    branchConversion,
  );

  return { profit, currency };
}

function branchGroupCurrency(
  sale: ICSale,
  groups: ICRateGroup[],
  branchId: string,
): string | undefined {
  if (sale.currency) return sale.currency;
  if (!sale.orderCustomerId) return getAdminAssignedBranchRateGroup(groups, branchId)?.currency;
  return resolveBranchCustomerOrderRate(groups, {
    branchId,
    customerId: sale.orderCustomerId,
    branchCustomerIds: new Set(),
  })?.currency;
}

export function formatBranchProfit(value: number, currency: string): string {
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${formatted} ${currency}`;
}
