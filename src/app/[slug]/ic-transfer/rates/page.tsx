import React from 'react';
import { requireICTransferBranchManager } from '@/lib/icTransfer/requireBranchPortalManager';
import ICTransferRatesPage from '@/components/ic-transfer/settings/ICTransferRatesPage';

export default async function ICTransferBranchRatesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { branchId } = await requireICTransferBranchManager(slug);

  return <ICTransferRatesPage portalMode="branch" branchId={branchId} />;
}
