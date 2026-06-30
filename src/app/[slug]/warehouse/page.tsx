import React from 'react';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import WarehouseDashboardClient from './WarehouseDashboardClient';

export default async function WarehouseDashboardPage(
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const user = await getSessionUser(params.slug);
  if (!user) redirect('/');

  if (user.role?.startsWith('delivery')) {
    redirect(`/${params.slug}/warehouse/order-settlement`);
  }

  return <WarehouseDashboardClient branchSlug={params.slug} />;
}
