import React from 'react';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettlementClient from './SettlementClient';

export default async function SettlementPage(
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const user = await getSessionUser(params.slug);
  if (!user) redirect('/');

  if (user.role?.startsWith('delivery')) {
    redirect(`/${params.slug}/warehouse/order-settlement`);
  }

  return <SettlementClient branchSlug={params.slug} />;
}
