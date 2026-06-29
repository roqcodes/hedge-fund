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
    address: row.address || undefined,
    imageUrl: row.image_url || undefined,
    serviceCharge: row.service_charge ? parseFloat(row.service_charge) : undefined,
    deliveryAgentId: row.delivery_agent_id || undefined,
    deliveryAgentName: row.delivery_agent_name || undefined,
    collectedAmount: row.collected_amount ? parseFloat(row.collected_amount) : undefined,
    priority: row.priority || undefined,
    deliveryStatus: row.delivery_status || undefined,
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
