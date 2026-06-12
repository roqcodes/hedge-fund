import SuperadminBranchGroups from '@/components/deals/SuperadminBranchGroups';

export default async function SuperadminBranchGroupsPage({ params }: { params: Promise<{ branchSlug: string }> }) {
  const resolvedParams = await params;
  return <SuperadminBranchGroups branchSlug={resolvedParams.branchSlug} />;
}
