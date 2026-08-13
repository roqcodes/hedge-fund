import { deleteAutoLedgerEntryByReference } from '@/app/actions/fundActions';

/**
 * IC Transfer is disconnected from the gold Funds ledger.
 * These helpers only remove leftover auto-rows if any still exist.
 */

export async function syncICSaleFundLedger(saleId: string): Promise<void> {
  await deleteAutoLedgerEntryByReference('ic_sale', saleId);
}

export async function syncICPurchaseFundLedger(purchaseId: string): Promise<void> {
  await deleteAutoLedgerEntryByReference('ic_purchase', purchaseId);
}

export async function removeICSaleFundLedger(saleId: string): Promise<void> {
  await deleteAutoLedgerEntryByReference('ic_sale', saleId);
}

export async function removeICPurchaseFundLedger(purchaseId: string): Promise<void> {
  await deleteAutoLedgerEntryByReference('ic_purchase', purchaseId);
}
