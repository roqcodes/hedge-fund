import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { isBranchPageEnabled } from '@/lib/branchPages';
import { hasFullBranchAccess } from '@/lib/rbac';

type BranchPortalManagerContext = {
  user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;
  branchId: string;
  branchName: string;
  hiddenPages: string[];
};

export async function requireICTransferBranchManager(slug: string): Promise<BranchPortalManagerContext> {
  const user = await getSessionUser(slug);
  if (!user) redirect(`/${slug}`);

  const branchRes = await query(
    `SELECT id, name, hidden_pages FROM branches WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  const branchRow = branchRes.rows[0];
  if (!branchRow) redirect(`/${slug}`);

  const hiddenPages = Array.isArray(branchRow.hidden_pages)
    ? branchRow.hidden_pages.map(String)
    : [];

  if (!isBranchPageEnabled('ic-transfer', hiddenPages)) {
    redirect(`/${slug}`);
  }

  if (!hasFullBranchAccess(user)) {
    redirect(`/${slug}/ic-transfer`);
  }

  return {
    user,
    branchId: branchRow.id,
    branchName: branchRow.name,
    hiddenPages,
  };
}
