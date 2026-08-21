import {
  syncICSaleToICFunds,
  syncICPurchaseToICFunds,
  removeICSaleFromICFunds,
  removeICPurchaseFromICFunds,
} from '@/lib/icFunds/icTransferFundSync';

/** Bridge IC Transfer lifecycle events into the IC Funds cash book. */
export async function syncICSaleFundLedger(saleId: string): Promise<void> {
  await syncICSaleToICFunds(saleId);
}

export async function syncICPurchaseFundLedger(purchaseId: string): Promise<void> {
  await syncICPurchaseToICFunds(purchaseId);
}

export async function removeICSaleFundLedger(saleId: string): Promise<void> {
  await removeICSaleFromICFunds(saleId);
}

export async function removeICPurchaseFundLedger(purchaseId: string): Promise<void> {
  await removeICPurchaseFromICFunds(purchaseId);
}
