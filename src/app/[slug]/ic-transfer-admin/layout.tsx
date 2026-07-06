import ICTransferModeEffect from '@/components/ic-transfer/ICTransferModeEffect';
import { ICTransferFilterProvider } from '@/components/ic-transfer/shared/ICTransferFilterProvider';
import { getSessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { query } from '@/lib/db';
import { canReadPage, isCustomerRole } from '@/lib/rbac';
import { isBranchPageEnabled } from '@/lib/branchPages';

export default async function ICTransferAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser(slug);
  if (!user) redirect(`/${slug}`);

  if (isCustomerRole(user.role)) {
    redirect(`/${slug}/ic-transfer`);
  }

  const branchRes = await query(`SELECT hidden_pages FROM branches WHERE slug = $1 LIMIT 1`, [slug]);
  const hiddenPages = Array.isArray(branchRes.rows[0]?.hidden_pages)
    ? branchRes.rows[0].hidden_pages.map(String)
    : [];

  if (!isBranchPageEnabled('ic-transfer-admin', hiddenPages) || !canReadPage(user, 'ic-transfer-admin', hiddenPages)) {
    redirect(`/${slug}`);
  }

  return (
    <ICTransferFilterProvider>
      <ICTransferModeEffect />
      {children}
    </ICTransferFilterProvider>
  );
}
