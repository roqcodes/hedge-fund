/** Typed domain models for the Warehouse Portal & Delivery module. */

export type DeliveryStatus = 'Pending' | 'Partial' | 'Completed' | 'Cancelled';
export type OrderPriority = 'High' | 'Normal' | 'Low';

export interface WarehouseOrder {
  id: string;
  customer_name: string;
  units: number;
  unit_rate: number;
  aed_amount: number;
  collected_amount: number | null;
  delivery_status: DeliveryStatus | null;
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
