'use client';

import { useEffect, useMemo, useState } from 'react';
import { getResource } from '@/lib/client';
import { money } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loading } from '@/components/ui/Loading';
import { Icon } from '@/components/ui/Icon';

const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
export default function CalendarPage(){
  const [data,setData]=useState<any>(null); const now=new Date(); const [year,setYear]=useState(now.getFullYear()); const [month,setMonth]=useState(now.getMonth()); const [selected,setSelected]=useState(now.toISOString().slice(0,10));
  useEffect(()=>{getResource('bookings').then(setData)},[]);
  const days=useMemo(()=>{const first=new Date(year,month,1);const count=new Date(year,month+1,0).getDate();const cells:any[]=[];for(let i=0;i<first.getDay();i++)cells.push(null);for(let d=1;d<=count;d++){const date=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;cells.push({d,date});}while(cells.length%7)cells.push(null);return cells},[year,month]);
  function move(delta:number){let m=month+delta,y=year;if(m<0){m=11;y--}if(m>11){m=0;y++}setMonth(m);setYear(y)}
  if(!data)return <Loading/>;
  const selectedEvents=data.bookings.filter((b:any)=>b.eventDate===selected&&['hold','confirmed','completed'].includes(b.status));
  return <>
    <PageHeader title="Booking Calendar" description="Red means confirmed, amber means temporary hold, and every hall/shift stays conflict-safe." actions={<div className="calendar-nav"><button className="btn" onClick={()=>move(-1)}><Icon name="chevron-left"/></button><strong>{monthNames[month]} {year}</strong><button className="btn" onClick={()=>move(1)}><Icon name="chevron-right"/></button></div>}/>
    <div className="calendar-layout"><section className="panel calendar-panel"><div className="calendar-weekdays">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(x=><span key={x}>{x}</span>)}</div><div className="calendar-grid">{days.map((cell,i)=>cell?<button key={cell.date} className={`calendar-day ${selected===cell.date?'selected':''}`} onClick={()=>setSelected(cell.date)}><span className="day-number">{cell.d}</span><div className="day-events">{data.bookings.filter((b:any)=>b.eventDate===cell.date&&['hold','confirmed','completed'].includes(b.status)).slice(0,3).map((b:any)=><span key={b.id} className={`calendar-event status-${b.status}`} title={`${b.code} ${b.customerName}`}><i/>{b.shift} · {b.customerName}</span>)}</div></button>:<div key={`blank-${i}`} className="calendar-day blank"/> )}</div></section>
      <aside className="panel calendar-side"><div className="panel-head"><div><h2>{selected}</h2><p>Bookings on selected date.</p></div></div>{selectedEvents.length?<div className="day-detail-list">{selectedEvents.map((b:any)=><div className="day-detail" key={b.id}><div className="day-detail-top"><strong>{b.customerName}</strong><span className={`status-pill status-${b.status}`}>{b.status}</span></div><span>{b.code} · {b.shift}</span><span>{b.hallName} · {b.guests} guests</span><span>{money(b.totalAmount,data.settings.currencySymbol)}</span></div>)}</div>:<div className="empty-mini calendar-empty"><Icon name="calendar2-check" size={24}/><strong>Available date</strong><span>No active booking on this date.</span></div>}<div className="calendar-legend"><span><i className="legend confirmed"/>Confirmed</span><span><i className="legend hold"/>Hold</span><span><i className="legend completed"/>Completed</span></div></aside>
    </div>
  </>;
}
