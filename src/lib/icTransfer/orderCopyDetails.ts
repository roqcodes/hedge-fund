import { formatUnits, getSaleInrAmount } from '@/lib/icTransfer/saleUnits';

/** Plain-text block for sharing payment details when no proof image is attached. */
export function formatOrderPaymentCopyText(address: string | undefined, units: number): string {
  const inrAmount = getSaleInrAmount(units);
  return [
    `Address: ${address?.trim() || ''}`,
    `Units: ${formatUnits(units)}`,
    `INR: ${inrAmount.toLocaleString('en-IN')}`,
  ].join('\n');
}
