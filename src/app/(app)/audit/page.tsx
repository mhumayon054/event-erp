'use client';
import { useEffect, useState } from 'react';
import { getResource } from '@/lib/client';
import { dateTime } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loading } from '@/components/ui/Loading';
import { Icon } from '@/components/ui/Icon';

export default function AuditPage(){const[data,setData]=useState<any>(null);const[search,setSearch]=useState('');useEffect(()=>{getResource('audit').then(setData)},[]);if(!data)return <Loading/>;const rows=data.logs.filter((l:any)=>!search||[l.actor,l.action,l.entity,l.message].join(' ').toLowerCase().includes(search.toLowerCase()));return <><PageHeader title="Audit History" description="Who changed what and when — payment, booking, menu and operations actions never disappear silently."/><div className="filterbar"><label className="table-search"><Icon name="search"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search audit history..."/></label></div><section className="panel"><div className="table-scroll"><table className="data-table"><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Area</th><th>Details</th></tr></thead><tbody>{rows.map((l:any)=><tr key={l.id}><td>{dateTime(l.createdAt)}</td><td>{l.actor}</td><td><span className="status-pill status-draft">{l.action}</span></td><td>{l.entity}</td><td className="audit-message">{l.message}</td></tr>)}{!rows.length?<tr><td colSpan={5}><div className="empty-row">No audit entries yet.</div></td></tr>:null}</tbody></table></div></section></>}
