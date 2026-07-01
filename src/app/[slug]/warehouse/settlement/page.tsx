import { redirect } from 'next/navigation';

/** Legacy route — order settlement is now the warehouse portal home. */
export default async function SettlementRedirectPage(
  props: { params: Promise<{ slug: string }> },
) {
  const params = await props.params;
  redirect(`/${params.slug}/warehouse`);
}
