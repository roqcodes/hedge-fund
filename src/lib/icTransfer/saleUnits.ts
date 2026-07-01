/** INR display for warehouse / delivery portals — matches branch convention (units × 1000). */
export function getSaleInrAmount(units: number, convertedAmount?: number | null): number {
  return Number(units) * 1000;
}

export function formatInr(units: number, convertedAmount?: number | null): string {
  return `${getSaleInrAmount(units, convertedAmount).toLocaleString('en-IN')} INR`;
}

export function formatUnits(units: number): string {
  return Number(units).toLocaleString(undefined, { maximumFractionDigits: 4 });
}

/** Scale financial fields when splitting or partial-delivering a sale. */
export function scaleSaleFinancials(
  originalUnits: number,
  newUnits: number,
  unitRate: number,
  serviceCharge: number = 0,
  conversionRate: number = 1,
) {
  const ratio = originalUnits > 0 ? newUnits / originalUnits : 1;
  const aedBase = newUnits * unitRate;
  const scaledService = serviceCharge * ratio;
  const aedAmount = Math.max(0, aedBase - scaledService);
  const convertedAmount = aedBase * conversionRate;
  return {
    units: newUnits,
    convertedAmount,
    aedAmount,
    serviceCharge: scaledService,
  };
}

export function getDeliveredUnits(
  units: number,
  collectedUnits?: number | null,
  orderStatus?: string | null,
): number {
  if (orderStatus === 'completed') {
    return collectedUnits != null && collectedUnits > 0 ? Number(collectedUnits) : Number(units);
  }
  return Number(collectedUnits || 0);
}

export function getRemainingUnits(
  units: number,
  collectedUnits?: number | null,
  orderStatus?: string | null,
): number {
  return Math.max(0, Number(units) - getDeliveredUnits(units, collectedUnits, orderStatus));
}

export function isSaleCompleted(orderStatus?: string | null): boolean {
  return orderStatus === 'completed';
}
