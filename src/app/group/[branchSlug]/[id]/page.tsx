import React from 'react';
import DealDetails from '@/components/deals/DealDetails';

export default async function SuperadminBranchGroupDetailsPage({
  params,
}: {
  params: Promise<{ branchSlug: string; id: string }>;
}) {
  const resolvedParams = await params;
  return (
    <main className="w-full">
      <DealDetails dealId={resolvedParams.id} />
    </main>
  );
}
