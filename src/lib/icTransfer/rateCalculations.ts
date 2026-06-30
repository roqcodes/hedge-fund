import type { ICRateGroup } from '@/types';

/** Sale rate on rate groups is always AED per unit. */
export function getCurrencyUnitRate(saleRateAed: number, conversionRate: number = 1): number {
  return saleRateAed * conversionRate;
}

export function computeICSaleAmounts(
  units: number,
  saleRateAed: number,
  conversionRate: number = 1,
  serviceCharge: number = 0,
) {
  const aedBaseTotal = units * saleRateAed;
  const aedNetTotal = Math.max(0, aedBaseTotal - serviceCharge);
  const currencyTotal = aedBaseTotal * conversionRate;
  const inrTotal = units * 1000;

  return {
    saleRateAed,
    conversionRate,
    currencyUnitRate: getCurrencyUnitRate(saleRateAed, conversionRate),
    aedBaseTotal,
    aedNetTotal,
    currencyTotal,
    inrTotal,
  };
}

export function resolveApplicableRateGroup(
  groups: ICRateGroup[],
  options: { branchId?: string; customerId?: string },
): ICRateGroup | undefined {
  const { branchId, customerId } = options;
  if (customerId) {
    const byCustomer = groups.find(g => g.customerIds?.includes(customerId));
    if (byCustomer) return byCustomer;
  }
  if (branchId) {
    return groups.find(g => g.branchIds?.includes(branchId));
  }
  return undefined;
}

export function formatAmount(value: number, fractionDigits = 2): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}
