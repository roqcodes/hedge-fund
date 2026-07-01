import { ICRegion, ICSupplier, ICWarehouse, ICRateGroup, ICPurchase, ICSale, ICWarehouseTransaction } from '@/types';

export function mapICRegionRow(row: any): ICRegion {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export function mapICSupplierRow(row: any): ICSupplier {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    commission: row.commission ? parseFloat(row.commission) : undefined,
    regionId: row.region_id,
    email: row.email,
    address: row.address,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export function mapICWarehouseRow(row: any): ICWarehouse {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    commission: row.commission ? parseFloat(row.commission) : undefined,
    regionId: row.region_id,
    email: row.email,
    address: row.address,
    currentStock: row.current_stock != null ? parseFloat(row.current_stock) : 0,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export function mapICRateGroupRow(row: any): ICRateGroup {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    region: row.region,
    currency: row.currency,
    saleRate: parseFloat(row.sale_rate),
    conversionRate: row.conversion_rate ? parseFloat(row.conversion_rate) : 1,
    customerIds: row.customer_ids || [],
    branchIds: row.branch_ids || [],
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export function mapICPurchaseRow(row: any): ICPurchase {
  return {
    id: row.id,
    supplierId: row.supplier_id,
    locationId: row.location_id,
    warehouseId: row.warehouse_id,
    unitRate: parseFloat(row.unit_rate),
    units: parseFloat(row.units),
    paymentMethod: row.payment_method,
    notes: row.notes,
    convertedTotal: row.converted_total ? parseFloat(row.converted_total) : undefined,
    aedTotal: row.aed_total ? parseFloat(row.aed_total) : undefined,
    paymentStatus: row.payment_status || 'pending',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export function mapICSaleRow(row: any): ICSale {
  return {
    id: row.id,
    customerName: row.customer_name,
    warehouseId: row.warehouse_id,
    transactionType: row.transaction_type,
    units: parseFloat(row.units),
    unitRate: parseFloat(row.unit_rate),
    convertedAmount: row.converted_amount ? parseFloat(row.converted_amount) : undefined,
    aedAmount: row.aed_amount ? parseFloat(row.aed_amount) : undefined,
    enteredBy: row.entered_by,
    enteredByName: row.entered_by_name,
    enteredByUserId: row.entered_by_user_id,
    paymentStatus: row.payment_status || 'pending',
    orderStatus: row.order_status || 'pending',
    rejectionRemarks: row.rejection_remarks || undefined,
    statusUpdatedAt: row.status_updated_at ? new Date(row.status_updated_at).toISOString() : undefined,
    statusUpdatedBy: row.status_updated_by || undefined,
    address: row.address || undefined,
    imageUrl: row.image_url || undefined,
    serviceCharge: row.service_charge ? parseFloat(row.service_charge) : undefined,
    bank: row.bank || undefined,
    conversionRate: row.conversion_rate ? parseFloat(row.conversion_rate) : undefined,
    currency: row.currency || undefined,
    deliveryAgentId: row.delivery_agent_id || undefined,
    deliveryAgentName: row.delivery_agent_name || undefined,
    collectedUnits: row.collected_units != null ? parseFloat(row.collected_units) : undefined,
    derivedFromSaleId: row.derived_from_sale_id || undefined,
    priority: row.priority || undefined,
    deliveryImageUrl: row.delivery_image_url || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export function mapICWarehouseTransactionRow(row: any): ICWarehouseTransaction {
  return {
    id: row.id,
    warehouseId: row.warehouse_id,
    transactionType: row.transaction_type,
    units: parseFloat(row.units),
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

type TxnIdRecord = {
  derivedFromSaleId?: string | null;
  derived_from_sale_id?: string | null;
  customerName?: string | null;
  customer_name?: string | null;
};

export function getFormattedTxnId(
  id: string,
  type: 'sale' | 'purchase',
  record?: unknown,
  branchesList?: { name: string }[]
): string {
  if (!id) return '';
  const shortId = id.includes('-') ? id.split('-')[0] : id.substring(0, 8);
  
  if (type === 'purchase') {
    return `IC-PU-${shortId}`;
  }

  const r = (record ?? null) as TxnIdRecord | null;

  // It is a sale
  const derivedId = r?.derivedFromSaleId || r?.derived_from_sale_id;
  if (derivedId) {
    return `IC-SA-DV-${shortId}`;
  }

  // Check if it's from a branch side
  const custName = r?.customerName || r?.customer_name;
  const isBranch = branchesList?.some(b => b.name === custName) || false;
  if (isBranch) {
    return `IC-SA-BR-${shortId}`;
  }

  return `IC-SA-AD-${shortId}`;
}
