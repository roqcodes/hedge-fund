import SuperadminBranchFunds from '@/components/funds/SuperadminBranchFunds';

export default async function SuperadminBranchFundsPage({ params }: { params: Promise<{ branchSlug: string }> }) {
  const resolvedParams = await params;
  return <SuperadminBranchFunds branchSlug={resolvedParams.branchSlug} />;
}