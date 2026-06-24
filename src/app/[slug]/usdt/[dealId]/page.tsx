import UsdtDealDetailPage from '@/components/usdt/UsdtDealDetailPage';

export default async function UsdtDealRoute({
  params,
}: {
  params: Promise<{ slug: string; dealId: string }>;
}) {
  const { slug, dealId } = await params;
  return <UsdtDealDetailPage branchSlug={slug} dealId={dealId} />;
}
