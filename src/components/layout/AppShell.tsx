'use client';

import { useEffect, useState } from 'react';
import type { VenueSettings } from '@/lib/types';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ settings, user, children }: { settings: VenueSettings; user: { name: string; role: string; expiresAt?: string }; children: React.ReactNode }) {
  const [mobileOpen,setMobileOpen]=useState(false);
  const [collapsed,setCollapsed]=useState(false);
  useEffect(()=>{const saved=window.localStorage.getItem('eventflow.sidebar.collapsed'); if(saved==='1')setCollapsed(true)},[]);
  function toggle(){ if(window.matchMedia('(max-width: 980px)').matches) setMobileOpen(v=>!v); else setCollapsed(v=>{const n=!v;localStorage.setItem('eventflow.sidebar.collapsed',n?'1':'0');return n;}); }
  return <div className={`app-root ${collapsed ? 'sidebar-collapsed' : ''}`} style={{['--accent' as any]:settings.accent}}>
    <Topbar settings={settings} user={user} collapsed={collapsed} onMenu={toggle}/>
    <Sidebar open={mobileOpen} collapsed={collapsed} role={user.role} onNavigate={()=>setMobileOpen(false)}/>
    <main className="app-content">{children}</main>
  </div>;
}
