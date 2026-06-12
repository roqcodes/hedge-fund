import React from 'react';
import TransactionDetails from '@/components/deals/TransactionDetails';

export default async function SuperadminBranchDealTransactionPage({
  params,
}: {
  params: Promise<{ branchSlug: string; id: string; dealId: string }>;
}) {
  const resolvedParams = await params;
  return (
    <main className="w-full">
      <TransactionDetails dealId={resolvedParams.id} txnId={resolvedParams.dealId} />
    </main>
  );
}
