'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { VenueSettings } from '@/lib/types';

export function Topbar({ settings, user, collapsed, onMenu }: { settings: VenueSettings; user: { name: string; role: string; expiresAt?: string }; collapsed: boolean; onMenu: () => void }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const isDemo=user.role==='demo';
  async function logout(){ await fetch('/api/auth/logout',{method:'POST'}); router.push('/login'); router.refresh(); }
  function submit(e: React.FormEvent){e.preventDefault(); const q=search.trim(); if(q) router.push(`/bookings?q=${encodeURIComponent(q)}`);}
  const displayName=settings.displayName||settings.legalName||'Marquee Operations';
  const expiry=user.expiresAt?new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short'}).format(new Date(user.expiresAt)):'';
  return <header className={`app-topbar ${collapsed ? 'collapsed' : ''}`}>
    <div className="topbar-brand">
      <button className="icon-button menu-toggle" type="button" onClick={onMenu} aria-label="Toggle navigation"><Icon name="layout-sidebar-inset" size={18}/></button>
      <div className="brand-identity brand-text-only" title={displayName}>
        <span className="brand-copy brand-name-only"><strong>{displayName}</strong></span>
      </div>
    </div>
    <div className="topbar-content">
      <form className="global-search" onSubmit={submit}><Icon name="search" size={15}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search bookings, customer or phone..." /></form>
      <div className="top-actions">
        {isDemo&&expiry?<span className="demo-session-note"><Icon name="clock-history" size={11}/>Demo access until {expiry}</span>:null}
        <button className="quick-add" type="button" onClick={()=>router.push('/bookings?new=1')} aria-label="New booking"><Icon name="plus-lg" size={16}/></button>
        <button className="top-action" type="button" onClick={()=>router.push('/calendar')} title="Calendar"><Icon name="calendar3"/></button>
        <button className="top-action" type="button" onClick={()=>router.push('/operations')} title="Readiness"><Icon name="check2-circle"/></button>
        <button className="top-action" type="button" onClick={()=>router.push('/automations')} title="WhatsApp"><Icon name="whatsapp"/></button>
        {!isDemo?<button className="top-action" type="button" onClick={()=>router.push('/settings')} title="Settings"><Icon name="gear"/></button>:null}
        <div className="user-menu">
          <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
          <div className="user-copy"><strong>{user.name}</strong><span>{isDemo?'Demo Access':user.role}</span></div>
          <button className="logout-button" type="button" onClick={logout} title="Sign out"><Icon name="box-arrow-right"/></button>
        </div>
      </div>
    </div>
  </header>;
}
