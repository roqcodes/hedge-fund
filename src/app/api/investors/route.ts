import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// A simple API Key middleware could go here, for now checking a hardcoded secret for demo purposes.
function authenticate(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  if (apiKey !== process.env.THIRD_PARTY_API_KEY && process.env.NODE_ENV === 'production') {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  if (!authenticate(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const take = parseInt(searchParams.get('limit') || '50', 10);
  const skip = parseInt(searchParams.get('offset') || '0', 10);

  try {
    const investors = await prisma.investors.findMany({
      where: status ? { status } : undefined,
      take,
      skip,
      include: {
        deposits: true,
      },
      orderBy: { joined_date: 'desc' }
    });

    return NextResponse.json({ success: true, data: investors });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
