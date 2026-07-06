import React from 'react';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import ICTransferBranch from '@/components/ic-transfer/branch/ICTransferBranch';
import { canReadPage } from '@/lib/rbac';
import { isBranchPageEnabled } from '@/lib/branchPages';

export default async function ICTransferPage(
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const user = await getSessionUser(params.slug);
  if (!user) redirect(`/${params.slug}`);

  const branchRes = await query(`SELECT hidden_pages FROM branches WHERE slug = $1 LIMIT 1`, [params.slug]);
  const hiddenPages = Array.isArray(branchRes.rows[0]?.hidden_pages)
    ? branchRes.rows[0].hidden_pages.map(String)
    : [];

  if (!isBranchPageEnabled('ic-transfer', hiddenPages)) {
    redirect(`/${params.slug}`);
  }

  if (!canReadPage(user, 'ic-transfer', hiddenPages)) {
    redirect(`/${params.slug}`);
  }

  return <ICTransferBranch />;
}
