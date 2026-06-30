import React from 'react';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import GroupsClient from './GroupsClient';

export default async function WarehouseGroupsPage(
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const user = await getSessionUser(params.slug);
  if (!user) redirect('/');

  if (user.role?.startsWith('delivery')) {
    redirect(`/${params.slug}/warehouse/order-settlement`);
  }

  return <GroupsClient branchSlug={params.slug} />;
}
