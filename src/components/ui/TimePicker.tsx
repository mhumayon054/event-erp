'use client';
import { Select, type SelectOption } from './Select';

const options:SelectOption[] = Array.from({length:96},(_,i)=>{const h=Math.floor(i/4),m=(i%4)*15;const value=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;const d=new Date(2000,0,1,h,m);const label=new Intl.DateTimeFormat('en-US',{hour:'numeric',minute:'2-digit',hour12:true}).format(d);return{value,label}});
export function TimePicker({value,onChange,placeholder='Select time',disabled=false}:{value:string;onChange:(v:string)=>void;placeholder?:string;disabled?:boolean}){return <Select value={value} options={options} onChange={onChange} placeholder={placeholder} disabled={disabled}/>}
