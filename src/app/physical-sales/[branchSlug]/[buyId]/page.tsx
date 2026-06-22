import PhysicalBuyDetailPage from '@/components/physical/PhysicalBuyDetailPage';

export default async function SuperadminPhysicalBuyDetailRoute({
  params,
}: {
  params: Promise<{ branchSlug: string; buyId: string }>;
}) {
  const { branchSlug, buyId } = await params;
  return <PhysicalBuyDetailPage branchSlug={branchSlug} buyId={buyId} />;
}
