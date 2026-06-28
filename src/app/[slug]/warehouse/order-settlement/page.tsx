import React from 'react';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OrderSettlementClient from './OrderSettlementClient';

export default async function OrderSettlementPage(
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const user = await getSessionUser(params.slug);
  if (!user) redirect('/');

  // Guard: Only allow delivery role to access
  if (!user.role?.startsWith('delivery')) {
    redirect(`/${params.slug}/warehouse`);
  }

  return <OrderSettlementClient branchSlug={params.slug} />;
}
