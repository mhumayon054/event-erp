import crypto from 'node:crypto';
import type { AppData, UserRecord } from './types';
import { hashPassword, makeId } from './store';

export function createTemporaryDemoUser(data: AppData, rawLabel: string, rawHours: number) {
  const accessLabel=String(rawLabel||'').trim()||'Marquee Demo';
  const hours=Math.max(1,Math.min(24*14,Number.isFinite(rawHours)?rawHours:72));
  const base=accessLabel.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,18)||'demo';
  let username='';
  do { username=`${base}-${crypto.randomInt(1000,10000)}`; } while(data.users.some(u=>u.username.toLowerCase()===username.toLowerCase()));
  const password=`D${crypto.randomBytes(7).toString('base64url')}!7`;
  const hp=hashPassword(password);
  const now=new Date();
  const expiresAt=new Date(now.getTime()+hours*3600000).toISOString();
  const user:UserRecord={id:makeId('user'),name:accessLabel,username,role:'demo',passwordSalt:hp.salt,passwordHash:hp.hash,mustChangePassword:false,active:true,expiresAt,accessLabel,createdAt:now.toISOString()};
  data.users.push(user);
  return { user, credentials:{username,password,expiresAt} };
}

export function revokeTemporaryDemoUser(data: AppData, id: string) {
  const user=data.users.find(u=>u.id===id&&u.role==='demo');
  if(!user) throw new Error('Demo access not found.');
  user.active=false;
  data.sessions=data.sessions.filter(s=>s.userId!==user.id);
  return user;
}
