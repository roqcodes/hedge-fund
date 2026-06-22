export const IC_CITY_SUMMARY = {
  purchase: { vol: 100, rates: [3810, 4567, 5645, 5432] },
  due: { vol: 100, rates: [3810, 4567, 5645, 5432] },
};

export const IC_SALE_SUMMARY = {
  purchase: { vol: 100, rates: [3810, 4567, 5645, 5432], statuses: ['Processing', 'Done', 'Done', 'Done'] as const },
};

export const IC_BALANCE = 55000;

export const IC_WAREHOUSE_WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5'] as const;

export const IC_WAREHOUSE_ROWS = [
  { label: 'Purchase Unit', values: [100, 100, 100, 100, 100] },
  { label: 'Received Unit', values: [65, 65, 65, 65, 65] },
  { label: 'Cleared Unit', values: [65, 65, 65, 65, 65] },
  { label: 'Processing Unit', values: [35, 35, 35, 35, 35] },
  { label: 'Pending', values: [35, 35, 35, 35, 35] },
  { label: 'Balance Unit', values: [35, 35, 35, 35, 35] },
  { label: 'Service Charge', values: [10000, 10000, 10000, 10000, 10000] },
  { label: 'Due', values: [10000, 10000, 10000, 10000, 10000] },
];

export const IC_CHART_DATA = [
  { month: 'Jan', assigned: 0, notAssigned: 0 },
  { month: 'Feb', assigned: 0, notAssigned: 0 },
  { month: 'Mar', assigned: 0, notAssigned: 0 },
  { month: 'Apr', assigned: 5, notAssigned: 0 },
  { month: 'May', assigned: 5, notAssigned: 0 },
  { month: 'Jun', assigned: 0, notAssigned: 0 },
];

export const IC_MOCK_USERS = [
  { id: 'USER0015', name: 'Agent Alpha', phone: '+91 98765 43210', rate: '42', status: 'Active', registeredAt: '5/10/2026' },
  { id: 'USER0016', name: 'Warehouse Beta', phone: '+91 87654 32109', rate: '0', status: 'Active', registeredAt: '5/10/2026' },
  { id: 'USER0017', name: 'Supplier Gamma', phone: '+91 76543 21098', rate: '38', status: 'Active', registeredAt: '5/11/2026' },
  { id: 'USER0018', name: 'Farhan Ali', phone: '+91 65432 10987', rate: '40', status: 'Inactive', registeredAt: '5/12/2026' },
];

export const IC_PURCHASE_COLUMNS = [
  '#', 'Date', 'ID', 'Supplier', 'Location', 'Booking (Unit)', 'Rate', 'Warehouse',
  'Total (₹)', 'Total (AED)', 'Payment Type', 'Due (₹)',
];

export const IC_SALE_COLUMNS = [
  '#', 'Date', 'ID', 'Customer', 'Agent Name', 'Country', 'Location', 'Order (Unit)',
  'Rate', 'Address', 'Mode', 'Amt (₹)', 'Amt (AED)',
];
