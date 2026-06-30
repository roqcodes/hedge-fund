/** Typed domain models for the Warehouse Portal & Delivery module. */

export type DeliveryStatus = 'Pending' | 'Partial' | 'Completed' | 'Cancelled';
export type OrderPriority = 'High' | 'Normal' | 'Low';

export type ICOrderStatus =
  | 'pending'
  | 'accepted'
  | 'admin_rejected'
  | 'wh_rejected'
  | 'wh_processing'
  | 'da_rejected'
  | 'completed';

export interface WarehouseOrder {
  id: string;
  customer_name: string;
  units: number;
  collected_units: number | null;
  derived_from_sale_id: string | null;
  converted_amount: number | null;
  unit_rate: number;
  aed_amount: number;
  order_status: ICOrderStatus | null;
  rejection_remarks: string | null;
  priority: OrderPriority | null;
  delivery_agent_id: string | null;
  delivery_agent_name: string | null;
  delivery_agent_account_id: string | null;
  delivery_agent_email: string | null;
  created_at: string;
  image_url: string | null;
  delivery_image_url: string | null;
  address: string | null;
  warehouse_id: string;
}

export interface DeliveryAgent {
  id: string;
  warehouse_id: string;
  account_id: string;
  name: string;
  email: string;
  phone: string | null;
  group_id: string | null;
  region_id: string | null;
  group_name: string | null;
  region_name: string | null;
  created_at: string;
}

export interface WarehouseGroup {
  id: string;
  warehouse_id: string;
  name: string;
  description: string | null;
}

/** Date filter preset keys (mirror DateFilterBar). */
export type DateFilterKey =
  | 'today'
  | 'yesterday'
  | 'this-week'
  | 'last-week'
  | 'this-month'
  | 'last-month'
  | 'all-time'
  | 'custom';
