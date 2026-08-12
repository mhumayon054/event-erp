'use client';

import { FormEvent, useEffect, useState } from 'react';
import { getResource, postAction } from '@/lib/client';
import { shortDate } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loading } from '@/components/ui/Loading';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';

const blank={customerName:'',phone:'',eventDate:'',shift:'Evening',eventType:'Wedding',guests:300,budget:0,source:'Walk-in',notes:'',nextFollowUp:''};
const stages=[['new','New'],['follow_up','Follow-up'],['tentative','Tentative'],['hold','Hold'],['confirmed','Confirmed'],['lost','Lost']] as const;
const stageOptions=stages.map(([value,label])=>({value,label}));
const shifts=['Morning','Evening','Night'].map(v=>({value:v,label:v}));
const eventTypes=['Wedding','Walima','Mehndi','Engagement','Corporate','Other'].map(v=>({value:v,label:v}));
const sources=['Walk-in','WhatsApp','Phone Call','Facebook','Instagram','Referral'].map(v=>({value:v,label:v}));
export default function InquiriesPage(){
 const [data,setData]=useState<any>(null);const[open,setOpen]=useState(false);const[form,setForm]=useState({...blank});const[toast,setToast]=useState<{m:string;t:'success'|'error'}|null>(null);const[saving,setSaving]=useState(false);
 async function load(){setData(await getResource('inquiries'))} useEffect(()=>{load()},[]);
 async function submit(e:FormEvent){e.preventDefault();setSaving(true);try{await postAction('createInquiry',form);setOpen(false);setForm({...blank});setToast({m:'Inquiry saved and added to follow-up pipeline.',t:'success'});await load()}catch(err){setToast({m:err instanceof Error?err.message:'Could not save inquiry',t:'error'})}finally{setSaving(false)}}
 async function move(id:string,status:string){try{await postAction('updateInquiry',{id,status});await load()}catch(e){setToast({m:e instanceof Error?e.message:'Update failed',t:'error'})}}
 if(!data)return <Loading/>;
 return <><PageHeader title="Inquiry Pipeline" description="Never lose a walk-in or WhatsApp lead. Track every inquiry until it confirms or is marked lost." actions={<button className="btn btn-primary" onClick={()=>setOpen(true)}><Icon name="person-plus"/>New Inquiry</button>}/>
 <div className="pipeline-grid">{stages.map(([key,label])=>{const rows=data.inquiries.filter((i:any)=>i.status===key);return <section className="pipeline-column" key={key}><div className="pipeline-head"><strong>{label}</strong><span>{rows.length}</span></div><div className="pipeline-body">{rows.map((i:any)=><article className="inquiry-card" key={i.id}><div className="inquiry-top"><strong>{i.customerName}</strong><span>{i.code}</span></div><p><Icon name="telephone"/>{i.phone}</p><p><Icon name="calendar3"/>{i.eventDate?shortDate(i.eventDate):'Date not decided'} · {i.shift}</p><p><Icon name="people"/>{i.guests||0} guests · {i.eventType}</p>{i.nextFollowUp?<p className="followup"><Icon name="bell"/>Follow-up {shortDate(i.nextFollowUp)}</p>:null}<Select compact ariaLabel={`Move ${i.code}`} value={i.status} options={stageOptions} onChange={v=>move(i.id,v)}/></article>)}{!rows.length?<div className="pipeline-empty">No inquiries</div>:null}</div></section>})}</div>
 <Modal open={open} title="New Inquiry" subtitle="Capture the lead first. A quotation or booking can happen later without losing the follow-up." onClose={()=>setOpen(false)}><form onSubmit={submit}><div className="form-grid form-grid-2"><label className="field"><span>Customer Name *</span><input required value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/></label><label className="field"><span>Phone *</span><input required value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label className="field"><span>Preferred Date</span><DatePicker value={form.eventDate} onChange={v=>setForm({...form,eventDate:v})}/></label><label className="field"><span>Shift</span><Select value={form.shift} options={shifts} onChange={v=>setForm({...form,shift:v})}/></label><label className="field"><span>Event Type</span><Select value={form.eventType} options={eventTypes} onChange={v=>setForm({...form,eventType:v})}/></label><label className="field"><span>Expected Guests</span><input type="number" min="1" value={form.guests} onChange={e=>setForm({...form,guests:Number(e.target.value)})}/></label><label className="field"><span>Budget (PKR)</span><input type="number" min="0" value={form.budget} onChange={e=>setForm({...form,budget:Number(e.target.value)})}/></label><label className="field"><span>Source</span><Select value={form.source} options={sources} onChange={v=>setForm({...form,source:v})}/></label><label className="field"><span>Next Follow-up</span><DatePicker value={form.nextFollowUp} onChange={v=>setForm({...form,nextFollowUp:v})}/></label></div><label className="field"><span>Notes</span><textarea rows={3} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><div className="modal-actions"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Save Inquiry'}</button></div></form></Modal>{toast?<Toast message={toast.m} type={toast.t} onClose={()=>setToast(null)}/>:null}</>;
}
