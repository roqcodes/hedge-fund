import { getSessionUser } from '@/lib/auth';
import ICTransferPurchase from '@/components/ic-transfer/purchase/ICTransferPurchase';

export default async function ICTransferPurchasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser(slug);

  // Branch managers must purchase into their branch warehouses — not HQ ones.
  if (user?.role === 'branch_manager' && user.branchId) {
    return <ICTransferPurchase portalMode="branch" branchId={user.branchId} />;
  }

  return <ICTransferPurchase />;
}
