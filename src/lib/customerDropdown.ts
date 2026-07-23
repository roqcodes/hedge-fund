/** Customer combo label with fund-ledger USDT receivable / payable (not legacy AED balance). */
export function formatCustomerDropdownLabel(name: string, netUsdt?: number | null): string {
  if (netUsdt == null || !Number.isFinite(netUsdt) || Math.abs(netUsdt) < 0.0001) {
    return name;
  }
  const abs = Math.abs(netUsdt);
  const formatted = abs.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  return netUsdt > 0 ? `${name} (Recv ${formatted} USDT)` : `${name} (Pay ${formatted} USDT)`;
}

export function buildCustomerComboOptions(
  customers: { id: string; name: string; netUsdt?: number | null }[],
) {
  return customers.map(c => ({
    value: c.id,
    label: formatCustomerDropdownLabel(c.name, c.netUsdt),
  }));
}
