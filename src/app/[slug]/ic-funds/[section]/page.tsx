import { notFound, redirect } from 'next/navigation';
import ICFundsApp from '@/components/ic-funds/ICFundsApp';
import { isICFundsReportId, isICFundsSection, legacyReportPathToView } from '@/lib/icFunds/nav';

export default async function ICFundsSectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; section: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { slug, section } = await params;
  const query = await searchParams;
  const legacyView = legacyReportPathToView(section);
  if (legacyView) {
    redirect(`/${slug}/ic-funds/reports?view=${legacyView}`);
  }
  if (!isICFundsSection(section)) notFound();
  const reportView = isICFundsReportId(query.view) ? query.view : 'all-vouchers';
  return <ICFundsApp section={section} reportView={reportView} />;
}
