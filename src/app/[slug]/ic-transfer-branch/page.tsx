import React from 'react';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ICTransferBranch from '@/components/ic-transfer/branch/ICTransferBranch';

export default async function ICTransferBranchPage(
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const user = await getSessionUser(params.slug);
  if (!user) redirect('/');

  return <ICTransferBranch />;
}
