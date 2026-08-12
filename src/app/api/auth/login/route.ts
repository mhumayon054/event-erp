import { NextResponse } from 'next/server';
import { createSession, SESSION_COOKIE } from '@/lib/auth';
import { readData, verifyPassword } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const data = await readData();
  const user = data.users.find((u) => u.username.toLowerCase() === username);
  if (!user || !verifyPassword(user, password)) {
    return NextResponse.json({ ok: false, error: 'Invalid username or password.' }, { status: 401 });
  }
  if (user.active === false) return NextResponse.json({ ok: false, error: 'This access has been disabled.' }, { status: 403 });
  if (user.expiresAt && new Date(user.expiresAt).getTime() <= Date.now()) return NextResponse.json({ ok: false, error: 'This demo access has expired.' }, { status: 403 });
  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true, user: { name: user.name, role: user.role, mustChangePassword: user.mustChangePassword, expiresAt: user.expiresAt } });
  response.cookies.set(SESSION_COOKIE, session.token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', expires: new Date(session.expiresAt), path: '/' });
  return response;
}
