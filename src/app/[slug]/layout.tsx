import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const branchName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return {
    title: `${branchName} — AIBAK Capital`,
    manifest: `/api/manifest/${slug}`,
  };
}

export default function BranchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
