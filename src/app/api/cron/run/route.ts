import { NextResponse } from 'next/server';
import { runScheduledAutomations } from '@/lib/automations';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: 'CRON_SECRET is not configured.' }, { status: 503 });
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || new URL(request.url).searchParams.get('secret');
  if (provided !== secret) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const result = await runScheduledAutomations();
  return NextResponse.json({ ok: true, ...result });
}
