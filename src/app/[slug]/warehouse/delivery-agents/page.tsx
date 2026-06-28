import React from 'react';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DeliveryAgentsClient from './DeliveryAgentsClient';

export default async function DeliveryAgentsPage(
  props: { params: Promise<{ slug: string }> }
) {
  const params = await props.params;
  const user = await getSessionUser(params.slug);
  if (!user) redirect('/');

  if (user.role?.startsWith('delivery')) {
    redirect(`/${params.slug}/warehouse`);
  }

  return <DeliveryAgentsClient branchSlug={params.slug} />;
}
