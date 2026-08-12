'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';

const items = [
  ['/', 'Dashboard', 'grid-1x2'],
  ['/calendar', 'Booking Calendar', 'calendar3'],
  ['/bookings', 'Bookings', 'journal-check'],
  ['/inquiries', 'Inquiries', 'people'],
  ['/menu', 'Menu & Pricing', 'card-list'],
  ['/payments', 'Payments', 'wallet2'],
  ['/documents', 'Quotes & Receipts', 'file-earmark-pdf'],
  ['/operations', 'Event Readiness', 'check2-square'],
  ['/vendors', 'Vendors & Tasks', 'truck'],
  ['/function-sheets', 'Function Sheets', 'file-earmark-text'],
  ['/automations', 'WhatsApp Automation', 'whatsapp'],
  ['/reports', 'Reports', 'graph-up-arrow'],
  ['/audit', 'Audit History', 'clock-history'],
  ['/settings', 'Settings', 'gear']
] as const;

export function Sidebar({ open, collapsed, role, onNavigate }: { open: boolean; collapsed: boolean; role: string; onNavigate: () => void }) {
  const pathname = usePathname();
  const visible=role==='demo'?items.filter(([href])=>!['/settings','/audit'].includes(href)):items;
  return <>
    <div className={`sidebar-backdrop ${open ? 'show' : ''}`} onClick={onNavigate} />
    <aside className={`app-sidebar ${open ? 'mobile-open' : ''} ${collapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {visible.map(([href,label,icon]) => {
          const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return <Link key={href} href={href} className={`nav-item ${active ? 'active' : ''}`} onClick={onNavigate} title={collapsed ? label : undefined}>
            <span className="nav-icon-wrap"><Icon name={icon} size={16} /></span><span className="nav-label">{label}</span>
          </Link>;
        })}
      </nav>
    </aside>
  </>;
}
