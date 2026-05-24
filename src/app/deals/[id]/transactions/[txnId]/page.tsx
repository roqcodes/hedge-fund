import React from 'react';
import TransactionDetails from '@/components/deals/TransactionDetails';

export default async function DealTransactionPage({
  params,
}: {
  params: Promise<{ id: string; txnId: string }>;
}) {
  const resolvedParams = await params;
  return (
    <main className="w-full">
      <TransactionDetails dealId={resolvedParams.id} txnId={resolvedParams.txnId} />
    </main>
  );
}
