import { redirect } from 'next/navigation';

/** Legacy route — group management has been removed. */
export default async function GroupsRedirectPage(
  props: { params: Promise<{ slug: string }> },
) {
  const params = await props.params;
  redirect(`/${params.slug}/warehouse`);
}
