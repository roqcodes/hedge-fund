export type ICTransferNavItem = {
  id: string;
  label: string;
  path: string;
  children?: ICTransferNavItem[];
};

/** Secondary navigation under IC Transfer & Reverse */
export const IC_TRANSFER_NAV: ICTransferNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', path: '' },
  { id: 'purchase', label: 'Purchase', path: '/purchase' },
  { id: 'sales', label: 'Sales', path: '/sales' },
  { id: 'warehouse', label: 'Warehouse', path: '/warehouse' },
  {
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    children: [
      { id: 'warehouses', label: 'Warehouse Management', path: '/settings/warehouses' },
      { id: 'suppliers', label: 'Supplier Management', path: '/settings/suppliers' },
      { id: 'rates', label: 'Rates Management', path: '/settings/rates' },
      { id: 'commission', label: 'Commission Management', path: '/settings/commission' },
    ],
  },
];

export const IC_TRANSFER_CITIES = ['Mumbai', 'Delhi', 'Chennai', 'Bangalore'] as const;

export const IC_TRANSFER_LOCATIONS = ['ALL', 'UAE', 'KSA', 'BH'] as const;
