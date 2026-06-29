import SuperadminBranchPhysical from '@/components/physical/SuperadminBranchPhysical';

export default async function SuperadminBranchPhysicalPage({ params }: { params: Promise<{ branchSlug: string }> }) {
  const resolvedParams = await params;
  return <SuperadminBranchPhysical branchSlug={resolvedParams.branchSlug} />;
}
