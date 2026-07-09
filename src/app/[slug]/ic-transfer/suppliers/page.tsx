import React from 'react';
import { requireICTransferBranchManager } from '@/lib/icTransfer/requireBranchPortalManager';
import ICTransferSuppliersPage from '@/components/ic-transfer/settings/ICTransferSuppliersPage';

export default async function ICTransferBranchSuppliersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { branchId } = await requireICTransferBranchManager(slug);

  return <ICTransferSuppliersPage portalMode="branch" branchId={branchId} />;
}
