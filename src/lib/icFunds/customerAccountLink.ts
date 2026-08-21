import type { ICFundAccount } from '@/types';

/** Resolve branch customer id from an IC Funds personal account, if linked. */
export function resolveCustomerIdFromFundAccount(account: ICFundAccount): string | null {
  if (account.customerId) return account.customerId;
  if (
    account.sourceType === 'ic_customer' &&
    account.sourceId &&
    !account.sourceId.startsWith('name:')
  ) {
    return account.sourceId;
  }
  return null;
}
