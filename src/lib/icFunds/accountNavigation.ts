import type { ICFundAccount } from '@/types';
import { resolveCustomerIdFromFundAccount } from '@/lib/icFunds/customerAccountLink';

export function icFundAccountDetailPath(slug: string, accountId: string): string {
  return `/${slug}/ic-funds/accounts/${accountId}`;
}

/** Where a row click should navigate — customer profile or IC Funds account detail. */
export function resolveAccountDetailHref(slug: string, account: ICFundAccount): string {
  const customerId = resolveCustomerIdFromFundAccount(account);
  if (customerId) return `/${slug}/customers/${customerId}?from=ic-funds`;
  return icFundAccountDetailPath(slug, account.id);
}

export function isCustomerFundAccount(account: ICFundAccount): boolean {
  return Boolean(resolveCustomerIdFromFundAccount(account));
}
