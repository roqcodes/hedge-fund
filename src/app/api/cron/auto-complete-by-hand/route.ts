import { NextRequest, NextResponse } from 'next/server';
import { autoCompleteByHandOrdersCronAction } from '@/app/actions/icTransferActions';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';

export const dynamic = 'force-dynamic';

/**
 * Daily 10:00 PM UAE (GST, UTC+4) → 18:00 UTC.
 * Configure in vercel.json or your scheduler.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request.headers.get('authorization'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const res = await autoCompleteByHandOrdersCronAction();
  if (!res.success) {
    return NextResponse.json({ error: res.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    completedCount: res.data?.completedCount ?? 0,
    ranAt: new Date().toISOString(),
  });
}
