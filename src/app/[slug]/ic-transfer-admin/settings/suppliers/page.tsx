import { getSessionUser } from '@/lib/auth';
import ICTransferSuppliersPage from '@/components/ic-transfer/settings/ICTransferSuppliersPage';

export default async function SupplierManagementPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser(slug);

  if (user?.role === 'branch_manager' && user.branchId) {
    return <ICTransferSuppliersPage portalMode="branch" branchId={user.branchId} />;
  }

  return <ICTransferSuppliersPage portalMode="admin" />;
}
