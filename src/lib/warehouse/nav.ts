export type WarehouseNavPageId =
  | 'settlement'
  | 'delivery-agents'
  | 'order-settlement';

export type WarehouseNavPage = {
  id: WarehouseNavPageId;
  label: string;
  path: string;
};

export const WAREHOUSE_NAV: WarehouseNavPage[] = [
  { id: 'settlement', label: 'Order Settlement', path: '' },
  { id: 'delivery-agents', label: 'Delivery Agent Management', path: '/delivery-agents' },
  { id: 'order-settlement', label: 'Order Settlement', path: '/order-settlement' },
];
