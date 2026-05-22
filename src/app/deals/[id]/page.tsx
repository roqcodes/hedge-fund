import DealDetails from '@/components/deals/DealDetails';

export default async function DealDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <DealDetails dealId={resolvedParams.id} />;
}
