import type { ICWarehouseTransaction } from '@/types';

/** Balance units in warehouse: received − cleared − processing. */
export function computeWarehouseCurrentStock(
  warehouseId: string,
  transactions: ICWarehouseTransaction[],
): number {
  let received = 0;
  let cleared = 0;
  let processing = 0;

  for (const t of transactions) {
    if (t.warehouseId !== warehouseId) continue;
    if (t.transactionType === 'receive') received += Number(t.units || 0);
    else if (t.transactionType === 'clear') cleared += Number(t.units || 0);
    else if (t.transactionType === 'processing') processing += Number(t.units || 0);
  }

  return received - cleared - processing;
}
