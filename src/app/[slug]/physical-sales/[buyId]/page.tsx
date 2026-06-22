import PhysicalBuyDetailPage from '@/components/physical/PhysicalBuyDetailPage';

export default async function PhysicalBuyDetailRoute({
  params,
}: {
  params: Promise<{ slug: string; buyId: string }>;
}) {
  const { slug, buyId } = await params;
  return <PhysicalBuyDetailPage branchSlug={slug} buyId={buyId} />;
}
