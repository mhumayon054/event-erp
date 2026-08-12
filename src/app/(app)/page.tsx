'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getResource, postAction } from '@/lib/client';
import { money, shortDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loading } from '@/components/ui/Loading';
import { Icon } from '@/components/ui/Icon';
import { Toast } from '@/components/ui/Toast';

export default function DashboardPage(){
  const router=useRouter(); const [data,setData]=useState<any>(null); const [error,setError]=useState(''); const [toast,setToast]=useState('');
  async function load(){try{setError('');setData(await getResource('dashboard'));}catch(e){setError(e instanceof Error?e.message:'Failed to load dashboard')}}
  useEffect(()=>{load()},[]);
  async function seed(){try{await postAction('seedDemo');setToast('Demo data loaded.');await load()}catch(e){setToast(e instanceof Error?e.message:'Could not load demo data')}}
  if(!data)return <Loading/>;
  const s=data.stats;
  return <>
    <PageHeader title="Dashboard" description="One view for bookings, collections, pending balances and upcoming event readiness." actions={<><button className="btn" onClick={()=>router.push('/calendar')}><Icon name="calendar3"/>Calendar</button><button className="btn btn-primary" onClick={()=>router.push('/bookings?new=1')}><Icon name="plus-lg"/>New Booking</button></>}/>
    {error?<div className="alert alert-danger">{error}</div>:null}
    <section className="metric-grid">
      <Metric label="Confirmed Bookings" value={s.confirmedBookings} icon="journal-check" />
      <Metric label="Total Collection" value={money(s.collected,data.settings.currencySymbol)} icon="wallet2" tone="green" />
      <Metric label="Pending Balance" value={money(s.pendingBalance,data.settings.currencySymbol)} icon="hourglass-split" tone="orange" />
      <Metric label="Follow-ups" value={s.followUps} icon="telephone" tone="blue" />
      <Metric label="Next 7 Days" value={s.upcoming7} icon="calendar-event" tone="purple" />
    </section>

    <div className="dashboard-grid">
      <section className="panel panel-main">
        <div className="panel-head"><div><h2>Upcoming Events</h2><p>Readiness and payment status for the next seven days.</p></div><button className="btn btn-quiet" onClick={()=>router.push('/operations')}>View operations <Icon name="arrow-right"/></button></div>
        {data.upcoming.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Booking</th><th>Client</th><th>Event</th><th>Hall</th><th>Balance</th><th>Readiness</th></tr></thead><tbody>{data.upcoming.map((b:any)=><tr key={b.id}><td><button className="link-button" onClick={()=>router.push(`/bookings?q=${encodeURIComponent(b.code)}`)}>{b.code}</button></td><td><strong>{b.customerName}</strong><span className="cell-sub">{b.phone}</span></td><td>{shortDate(b.eventDate)}<span className="cell-sub">{b.shift}</span></td><td>{b.hallName}</td><td className={b.balance>0?'text-orange':'text-green'}>{money(b.balance,data.settings.currencySymbol)}</td><td><div className="readiness-cell"><span>{b.readiness}%</span><div className="progress"><i style={{width:`${b.readiness}%`}}/></div></div></td></tr>)}</tbody></table></div>:<Empty title="No upcoming events" text="Create a confirmed booking and it will appear here." action={<button className="btn btn-primary" onClick={()=>router.push('/bookings?new=1')}>Create booking</button>}/>} 
      </section>
      <aside className="panel">
        <div className="panel-head"><div><h2>Needs Attention</h2><p>Pending money or readiness items.</p></div></div>
        <div className="attention-list">{data.attention.length?data.attention.map((b:any)=><button key={b.id} className="attention-item" onClick={()=>router.push('/operations')}><span className={`attention-dot ${b.readiness<70?'danger':b.readiness<100?'warning':'ok'}`}/><span><strong>{b.customerName}</strong><small>{shortDate(b.eventDate)} · {b.readiness}% ready · {money(b.balance,data.settings.currencySymbol)} due</small></span><Icon name="chevron-right"/></button>):<div className="empty-mini"><Icon name="check2-circle" size={22}/><span>Nothing urgent right now.</span></div>}</div>
      </aside>
    </div>

    <section className="panel" style={{marginTop:12}}>
      <div className="panel-head"><div><h2>Recent Collections</h2><p>Latest verified and pending payment entries.</p></div><button className="btn btn-quiet" onClick={()=>router.push('/payments')}>Payments <Icon name="arrow-right"/></button></div>
      {data.recentPayments.length?<div className="table-scroll"><table className="data-table"><thead><tr><th>Client</th><th>Booking</th><th>Method</th><th>Amount</th><th>Date</th></tr></thead><tbody>{data.recentPayments.map((p:any)=><tr key={p.id}><td>{p.booking?.customerName||'—'}</td><td>{p.booking?.code||'—'}</td><td>{p.method}</td><td className="text-green">{money(p.amount,data.settings.currencySymbol)}</td><td>{shortDate(p.paidAt)}</td></tr>)}</tbody></table></div>:<Empty title="Workspace is ready" text="There is no operational data yet. Load demo data to test every module, or create your first real booking." action={<div className="inline-actions"><button className="btn" onClick={seed}><Icon name="database-add"/>Load Demo Data</button><button className="btn btn-primary" onClick={()=>router.push('/bookings?new=1')}>Start Clean</button></div>}/>} 
    </section>
    {toast?<Toast message={toast} type={toast.includes('could')||toast.includes('only')?'error':'success'} onClose={()=>setToast('')}/>:null}
  </>;
}

function Metric({label,value,icon,tone=''}:{label:string;value:string|number;icon:string;tone?:string}){return <div className="metric-card"><span className={`metric-icon ${tone}`}><Icon name={icon} size={17}/></span><div><span>{label}</span><strong>{value}</strong></div></div>}
function Empty({title,text,action}:{title:string;text:string;action?:React.ReactNode}){return <div className="empty-state"><span className="empty-icon"><Icon name="inbox" size={22}/></span><strong>{title}</strong><p>{text}</p>{action}</div>}
