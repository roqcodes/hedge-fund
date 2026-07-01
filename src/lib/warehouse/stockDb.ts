import type { PoolClient } from 'pg';

/** Atomically adjust warehouse on-hand stock (positive = receive, negative = clear). */
export async function adjustWarehouseStock(
  client: PoolClient,
  warehouseId: string,
  deltaUnits: number,
): Promise<void> {
  if (!Number.isFinite(deltaUnits) || deltaUnits === 0) return;

  const res = await client.query(
    `UPDATE ic_warehouses
     SET current_stock = current_stock + $2
     WHERE id = $1
     RETURNING current_stock`,
    [warehouseId, deltaUnits],
  );

  if (res.rowCount === 0) {
    throw new Error('Warehouse not found');
  }
}

/** Log stock movement in the warehouse transaction ledger. */
export async function logWarehouseStockTransaction(
  client: PoolClient,
  warehouseId: string,
  transactionType: 'receive' | 'clear' | 'processing',
  units: number,
  referenceType: string,
  referenceId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO ic_warehouse_transactions (warehouse_id, transaction_type, units, reference_type, reference_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [warehouseId, transactionType, units, referenceType, referenceId],
  );
}
