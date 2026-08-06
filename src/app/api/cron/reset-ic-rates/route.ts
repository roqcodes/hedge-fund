import { NextRequest, NextResponse } from 'next/server';
import { autoResetICRatesCronAction } from '@/app/actions/icTransferSettingsActions';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

export const dynamic = 'force-dynamic';

/**
 * Daily 5:00 PM Dubai (GST, UTC+4) → 13:00 UTC.
 * Configure in vercel.json or your scheduler.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await autoResetICRatesCronAction();
  if (!res.success) {
    return NextResponse.json({ error: res.error }, { status: 500 });
  }

  const resetCount = res.data?.resetCount ?? 0;
  const skipped = res.data?.skipped === true;

  return NextResponse.json({
    ok: true,
    resetCount,
    skipped,
    reason: res.data?.reason,
    ranAt: new Date().toISOString(),
  });
}
