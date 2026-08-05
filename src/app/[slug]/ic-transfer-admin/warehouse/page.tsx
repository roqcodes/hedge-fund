import { getSessionUser } from '@/lib/auth';
import { query } from '@/lib/db';
import ICTransferWarehouse from '@/components/ic-transfer/warehouse/ICTransferWarehouse';

export default async function ICTransferWarehousePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getSessionUser(slug);

  // Branch managers manage their own warehouses even when opened via admin nav.
  if (user?.role === 'branch_manager' && user.branchId) {
    const branchRes = await query(
      `SELECT name FROM branches WHERE id = $1 LIMIT 1`,
      [user.branchId],
    );
    const custRes = await query(
      `SELECT id FROM customers WHERE branch_id = $1 ORDER BY name`,
      [user.branchId],
    );
    return (
      <ICTransferWarehouse
        portalMode="branch"
        branchId={user.branchId}
        branchName={String(branchRes.rows[0]?.name || '')}
        branchCustomerIds={custRes.rows.map((r: { id: string }) => r.id)}
      />
    );
  }

  return <ICTransferWarehouse />;
}
