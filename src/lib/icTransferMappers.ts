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
    branchId: row.branch_id ?? undefined,
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
    branchId: row.branch_id ?? undefined,
    currentStock: row.current_stock != null ? parseFloat(row.current_stock) : 0,
    sendDeliveryProofToCustomer: row.send_delivery_proof_to_customer !== false,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
  };
}

export function mapICRateGroupRow(row: any): ICRateGroup {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    currency: row.currency,
    saleRate: parseFloat(row.sale_rate),
    conversionRate: row.conversion_rate ? parseFloat(row.conversion_rate) : 1,
    customerIds: row.customer_ids || [],
    branchIds: row.branch_ids || [],
    createdByBranchId: row.created_by_branch_id ?? undefined,
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
    orderCustomerName: row.order_customer_name || undefined,
    orderCustomerId: row.order_customer_id || undefined,
    warehouseId: row.warehouse_id,
    transactionType: row.transaction_type,
    units: parseFloat(row.units),
    unitRate: parseFloat(row.unit_rate),
    adminUnitRate: row.admin_unit_rate != null ? parseFloat(row.admin_unit_rate) : undefined,
    adminConversionRate: row.admin_conversion_rate != null ? parseFloat(row.admin_conversion_rate) : undefined,
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
    location: row.location || undefined,
    district: row.district || undefined,
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
    fulfillmentHandler: row.fulfillment_handler === 'branch' ? 'branch' : 'hq_admin',
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
  branchesList?: { name: string }[],
  branchName?: string,
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

  const custName = r?.customerName || r?.customer_name;
  const orderCustName = (r as { orderCustomerName?: string; order_customer_name?: string } | null)
    ?.orderCustomerName
    || (r as { order_customer_name?: string } | null)?.order_customer_name;
  const orderCustId = (r as { orderCustomerId?: string; order_customer_id?: string } | null)
    ?.orderCustomerId
    || (r as { order_customer_id?: string } | null)?.order_customer_id;

  if (branchName && custName) {
    const isBranchSubmitted = custName.toLowerCase() === branchName.toLowerCase();
    return isBranchSubmitted ? `IC-SA-BR-${shortId}` : `IC-SA-CU-${shortId}`;
  }

  const isBranch = branchesList?.some(b => b.name === custName) || false;
  if (isBranch) {
    return `IC-SA-BR-${shortId}`;
  }

  // Customer-portal orders store the end customer in customer_name (not branch name).
  if (orderCustId && !orderCustName) {
    return `IC-SA-CU-${shortId}`;
  }

  return `IC-SA-AD-${shortId}`;
}
