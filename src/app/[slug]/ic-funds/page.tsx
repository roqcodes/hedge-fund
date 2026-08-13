import { redirect } from 'next/navigation';

export default async function ICFundsIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/${slug}/ic-funds/payments`);
}
