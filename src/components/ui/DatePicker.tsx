'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

const weekdays = ['Mo','Tu','We','Th','Fr','Sa','Su'];
const pad = (n:number) => String(n).padStart(2,'0');
function iso(y:number,m:number,d:number){ return `${y}-${pad(m+1)}-${pad(d)}`; }
function parse(value:string){ const [y,m,d]=value.split('-').map(Number); return y&&m&&d ? new Date(y,m-1,d) : null; }
function pretty(value:string){ const d=parse(value); return d ? new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(d) : ''; }

export function DatePicker({ value, onChange, placeholder='Select date', disabled=false, required=false }: { value:string; onChange:(value:string)=>void; placeholder?:string; disabled?:boolean; required?:boolean }){
  const ref=useRef<HTMLButtonElement>(null); const pop=useRef<HTMLDivElement>(null); const [open,setOpen]=useState(false); const selected=parse(value); const [cursor,setCursor]=useState(()=>selected||new Date()); const [pos,setPos]=useState({left:0,top:0});
  const y=cursor.getFullYear(), m=cursor.getMonth();
  const days=useMemo(()=>{const first=new Date(y,m,1);const start=(first.getDay()+6)%7;const count=new Date(y,m+1,0).getDate();const out:(number|null)[]=[];for(let i=0;i<start;i++)out.push(null);for(let d=1;d<=count;d++)out.push(d);while(out.length%7)out.push(null);return out},[y,m]);
  function position(){const r=ref.current?.getBoundingClientRect();if(!r)return;const width=282;let left=Math.min(Math.max(10,r.left),window.innerWidth-width-10);let top=r.bottom+5;if(top+330>window.innerHeight)top=Math.max(10,r.top-330);setPos({left,top})}
  useLayoutEffect(()=>{if(open)position()},[open]);
  useEffect(()=>{if(!open)return;const close=(e:MouseEvent)=>{const t=e.target as Node;if(!ref.current?.contains(t)&&!pop.current?.contains(t))setOpen(false)};const p=()=>position();document.addEventListener('mousedown',close);window.addEventListener('resize',p);window.addEventListener('scroll',p,true);return()=>{document.removeEventListener('mousedown',close);window.removeEventListener('resize',p);window.removeEventListener('scroll',p,true)}},[open]);
  function choose(day:number){onChange(iso(y,m,day));setOpen(false)}
  const today=new Date(); const todayIso=iso(today.getFullYear(),today.getMonth(),today.getDate());
  return <>
    <button ref={ref} type="button" className={`date-control ${open?'open':''}`} onClick={()=>!disabled&&setOpen(v=>!v)} disabled={disabled} aria-haspopup="dialog" aria-required={required}>
      <Icon name="calendar3" size={13}/><span className={value?'':'placeholder'}>{value?pretty(value):placeholder}</span><Icon name="chevron-down" size={10}/>
    </button>
    {open&&typeof document!=='undefined'?createPortal(<div ref={pop} className="date-popover" style={pos} role="dialog" aria-label="Choose date">
      <div className="date-popover-head"><button type="button" onClick={()=>setCursor(new Date(y,m-1,1))}><Icon name="chevron-left"/></button><strong>{new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date(y,m,1))}</strong><button type="button" onClick={()=>setCursor(new Date(y,m+1,1))}><Icon name="chevron-right"/></button></div>
      <div className="date-weekdays">{weekdays.map(w=><span key={w}>{w}</span>)}</div>
      <div className="date-days">{days.map((d,i)=>d?<button type="button" key={`${d}-${i}`} className={`${iso(y,m,d)===value?'selected':''} ${iso(y,m,d)===todayIso?'today':''}`} onClick={()=>choose(d)}>{d}</button>:<span key={`b-${i}`}/>)}</div>
      <div className="date-popover-foot"><button type="button" onClick={()=>{setCursor(today);chooseToday(onChange,setOpen)}}>Today</button>{value?<button type="button" onClick={()=>{onChange('');setOpen(false)}}>Clear</button>:null}</div>
    </div>,document.body):null}
  </>;
}
function chooseToday(onChange:(v:string)=>void,setOpen:(v:boolean)=>void){const d=new Date();onChange(iso(d.getFullYear(),d.getMonth(),d.getDate()));setOpen(false)}
