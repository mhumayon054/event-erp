import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'node:crypto';
import { mutateData, readData } from './store';

export const SESSION_COOKIE = 'eventflow_session';

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex');
  const data=readData();
  const user=data.users.find(u=>u.id===userId);
  const normalExpiry=Date.now() + 1000 * 60 * 60 * 24 * 14;
  const userExpiry=user?.expiresAt ? new Date(user.expiresAt).getTime() : normalExpiry;
  const expiresAt = new Date(Math.min(normalExpiry,userExpiry)).toISOString();
  await mutateData((data) => {
    data.sessions = data.sessions.filter((s) => s.userId !== userId);
    data.sessions.push({ token, userId, expiresAt });
  });
  return { token, expiresAt };
}

export function getCurrentUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const data = readData();
  const session = data.sessions.find((s) => s.token === token && new Date(s.expiresAt).getTime() > Date.now());
  if (!session) return null;
  const user = data.users.find((u) => u.id === session.userId);
  if (!user || user.active === false) return null;
  if (user.expiresAt && new Date(user.expiresAt).getTime() <= Date.now()) return null;
  return { id: user.id, name: user.name, username: user.username, role: user.role, mustChangePassword: user.mustChangePassword, expiresAt:user.expiresAt, accessLabel:user.accessLabel };
}

export function requireUser() {
  const user = getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await mutateData((data) => {
    data.sessions = data.sessions.filter((s) => s.token !== token);
  });
}
