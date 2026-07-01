import { formatDateTime } from '@/data/mockData';
import { getAdminStatusLabel } from '@/lib/icTransfer/orderStatus';
import { getFormattedTxnId } from '@/lib/icTransferMappers';
import {
  formatUnits,
  getDeliveredUnits,
  getRemainingUnits,
} from '@/lib/icTransfer/saleUnits';
import type { WarehouseOrder } from '@/types/warehouse';

export type WarehouseOrderSearchOptions = {
  branches?: { name: string }[];
  /** Include delivered-units column values (warehouse settlement table). Default true. */
  includeDelivered?: boolean;
  /** Include delivery agent column values. Default true. */
  includeAgent?: boolean;
};

function toSearchText(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function collectSearchableValues(
  order: WarehouseOrder,
  options: WarehouseOrderSearchOptions,
): string[] {
  const branches = options.branches;
  const includeDelivered = options.includeDelivered !== false;
  const includeAgent = options.includeAgent !== false;

  const delivered = getDeliveredUnits(
    Number(order.units),
    order.collected_units,
    order.order_status,
  );
  const remaining = getRemainingUnits(
    Number(order.units),
    order.collected_units,
    order.order_status,
  );

  const formattedId = getFormattedTxnId(order.id, 'sale', order, branches);
  const values: unknown[] = [
    formattedId,
    order.id,
    formatDateTime(toSearchText(order.created_at)),
    order.created_at,
    formatUnits(order.units),
    order.units,
    formatUnits(remaining),
    remaining,
    order.priority || 'Normal',
    getAdminStatusLabel(order.order_status),
    order.order_status || '',
    order.rejection_remarks || '',
  ];

  if (includeDelivered) {
    values.push(formatUnits(delivered), delivered);
  }

  if (order.derived_from_sale_id) {
    values.push('split', order.derived_from_sale_id);
    values.push(getFormattedTxnId(order.derived_from_sale_id, 'sale', order, branches));
  }

  if (includeAgent) {
    values.push(
      order.delivery_agent_name || 'Unassigned',
      order.delivery_agent_email || '',
      order.delivery_agent_account_id || '',
      order.delivery_agent_id || '',
    );
  }

  return values
    .map(toSearchText)
    .filter(text => text.length > 0);
}

/** Match a warehouse order against free-text search across all visible table fields. */
export function warehouseOrderMatchesSearch(
  order: WarehouseOrder,
  query: string,
  options: WarehouseOrderSearchOptions = {},
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  return collectSearchableValues(order, options).some(text =>
    text.toLowerCase().includes(q),
  );
}
