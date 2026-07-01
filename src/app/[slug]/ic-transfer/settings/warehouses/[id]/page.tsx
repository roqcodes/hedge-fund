import { redirect } from 'next/navigation';

export default async function LegacyWarehouseDetailsPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  redirect(`/${slug}/ic-transfer/warehouse/${id}`);
}
