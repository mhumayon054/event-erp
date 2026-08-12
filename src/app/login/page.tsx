'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

export default function LoginPage(){
  const router=useRouter(); const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [brand,setBrand]=useState({displayName:'Marquee Operations',initials:'',accent:'#2563eb'});
  useEffect(()=>{fetch('/api/public-config',{cache:'no-store'}).then(r=>r.json()).then(d=>{if(d.ok)setBrand({displayName:d.displayName||'Marquee Operations',initials:d.initials||'',accent:d.accent||'#2563eb'})}).catch(()=>undefined)},[]);
  async function login(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Login failed');router.push('/');router.refresh();}catch(err){setError(err instanceof Error?err.message:'Login failed');}finally{setBusy(false)}}
  return <main className="login-page" style={{['--accent' as any]:brand.accent}}><section className="login-card"><div className="login-brand"><strong>{brand.displayName}</strong><span>Operations Portal</span></div><h1>Welcome back</h1><p>Sign in to manage bookings, payments and event operations.</p><form onSubmit={login}><label className="field"><span>Username</span><div className="input-with-icon"><Icon name="person"/><input required value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username"/></div></label><label className="field"><span>Password</span><div className="input-with-icon"><Icon name="lock"/><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></div></label>{error?<div className="form-error"><Icon name="exclamation-circle"/>{error}</div>:null}<button className="btn btn-primary btn-block" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form><div className="demo-login"><strong>Secure workspace</strong><small>Use the access credentials provided by the venue administrator.</small></div></section></main>;
}
