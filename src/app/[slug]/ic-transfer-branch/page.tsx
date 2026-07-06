import { redirect } from 'next/navigation';

export default async function LegacyICTransferBranchRedirect(
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  redirect(`/${slug}/ic-transfer`);
}
