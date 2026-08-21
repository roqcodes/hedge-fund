import AccountDetailScreen from '@/components/ic-funds/AccountDetailScreen';
import ReadOnlyPill from '@/components/rbac/ReadOnlyPill';

export default async function ICFundAccountDetailPage({
  params,
}: {
  params: Promise<{ slug: string; accountId: string }>;
}) {
  await params;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-base font-semibold tracking-tight text-slate-900">IC Funds</h1>
        <ReadOnlyPill />
      </div>
      <AccountDetailScreen />
    </div>
  );
}
