import React from 'react';
import { requireICTransferBranchManager } from '@/lib/icTransfer/requireBranchPortalManager';
import ICTransferPurchase from '@/components/ic-transfer/purchase/ICTransferPurchase';

export default async function ICTransferBranchPurchasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { branchId } = await requireICTransferBranchManager(slug);

  return <ICTransferPurchase portalMode="branch" branchId={branchId} />;
}
