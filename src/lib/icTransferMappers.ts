import { ICRegion, ICSupplier, ICWarehouse, ICRates, ICPurchase, ICSale, ICWarehouseTransaction } from '@/types';

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

export function mapICRatesRow(row: any): ICRates {
  return {
    id: row.id,
    buyRate: parseFloat(row.buy_rate),
    saleRate: parseFloat(row.sale_rate),
    sarConversion: parseFloat(row.sar_conversion),
    inrConversion: parseFloat(row.inr_conversion),
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
    inrTotal: row.inr_total ? parseFloat(row.inr_total) : undefined,
    aedTotal: row.aed_total ? parseFloat(row.aed_total) : undefined,
    paymentStatus: row.payment_status || 'pending',
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export function mapICSaleRow(row: any): ICSale {
  return {
    id: row.id,
    customerName: row.customer_name,
    locationId: row.location_id,
    units: parseFloat(row.units),
    unitRate: parseFloat(row.unit_rate),
    address: row.address,
    paymentMode: row.payment_mode,
    inrAmount: row.inr_amount ? parseFloat(row.inr_amount) : undefined,
    aedAmount: row.aed_amount ? parseFloat(row.aed_amount) : undefined,
    enteredBy: row.entered_by,
    enteredByName: row.entered_by_name,
    enteredByUserId: row.entered_by_user_id,
    paymentStatus: row.payment_status || 'pending',
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
