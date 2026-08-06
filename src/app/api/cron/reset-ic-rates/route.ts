import { NextRequest, NextResponse } from 'next/server';
import { autoResetICRatesCronAction } from '@/app/actions/icTransferSettingsActions';

/**
 * Daily 5:00 PM Dubai (GST, UTC+4) → 13:00 UTC.
 * Configure in vercel.json or your scheduler.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await autoResetICRatesCronAction();
  if (!res.success) {
    return NextResponse.json({ error: res.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    resetCount: res.data?.resetCount ?? 0,
    ranAt: new Date().toISOString(),
  });
}
