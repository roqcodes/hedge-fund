export type WarehouseNavPageId =
  | 'dashboard'
  | 'settlement'
  | 'delivery-agents'
  | 'groups'
  | 'order-settlement';

export type WarehouseNavPage = {
  id: WarehouseNavPageId;
  label: string;
  path: string;
};

export const WAREHOUSE_NAV: WarehouseNavPage[] = [
  { id: 'dashboard', label: 'Dashboard', path: '' },
  { id: 'settlement', label: 'Warehouse Order Settlement', path: '/settlement' },
  { id: 'delivery-agents', label: 'Delivery Agent Management', path: '/delivery-agents' },
  { id: 'groups', label: 'Group Management', path: '/groups' },
  { id: 'order-settlement', label: 'Order Settlement', path: '/order-settlement' },
];
