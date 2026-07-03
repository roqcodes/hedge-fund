const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank / Transfer',
  USDT: 'USDT',
  MULTI_CURRENCY: 'Multy Currency',
};

export function physicalPaymentLabel(mode?: string): string {
  return mode ? PAYMENT_LABELS[mode] ?? mode : '—';
}
