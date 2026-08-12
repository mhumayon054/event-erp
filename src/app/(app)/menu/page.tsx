'use client';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { getResource, postAction } from '@/lib/client';
import { money } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Loading } from '@/components/ui/Loading';
import { Icon } from '@/components/ui/Icon';
import { Modal } from '@/components/ui/Modal';
import { Toast } from '@/components/ui/Toast';
import { Select } from '@/components/ui/Select';

const seasons=['All year','Summer','Winter'].map(v=>({value:v,label:v}));
const categories=['Main Course','Rice','Bread','Sides','Dessert','Drink','Starter','Extra'].map(v=>({value:v,label:v}));
export default function MenuPage(){
 const[data,setData]=useState<any>(null);const[open,setOpen]=useState(false);const[form,setForm]=useState({name:'',category:'Main Course',priceDelta:0,season:'All year'});const[toast,setToast]=useState<{m:string;t:'success'|'error'}|null>(null);
 async function load(){setData(await getResource('menu'))} useEffect(()=>{load()},[]);
 const grouped=useMemo(()=>{const g:Record<string,any[]>={};for(const m of data?.menuItems||[])(g[m.category]??=[]).push(m);return g},[data]);
 async function submit(e:FormEvent){e.preventDefault();try{await postAction('createMenuItem',form);setOpen(false);setForm({name:'',category:'Main Course',priceDelta:0,season:'All year'});setToast({m:'Menu item added.',t:'success'});await load()}catch(e){setToast({m:e instanceof Error?e.message:'Could not add item',t:'error'})}}
 async function toggle(id:string){try{await postAction('toggleMenuItem',{id});await load()}catch(e){setToast({m:e instanceof Error?e.message:'Update failed',t:'error'})}}
 if(!data)return <Loading/>;
 return <><PageHeader title="Menu & Pricing" description="Configure the base per-head model and transparent add-on prices used by every booking." actions={<button className="btn btn-primary" onClick={()=>setOpen(true)}><Icon name="plus-lg"/>Add Menu Item</button>}/>
 <section className="metric-grid metric-grid-3"><div className="metric-card"><span className="metric-icon blue"><Icon name="cash-stack"/></span><div><span>Default Base Rate</span><strong>{money(data.settings.defaultBaseRate,data.settings.currencySymbol)}/head</strong></div></div><div className="metric-card"><span className="metric-icon green"><Icon name="check2-circle"/></span><div><span>Active Items</span><strong>{data.menuItems.filter((m:any)=>m.active).length}</strong></div></div><div className="metric-card"><span className="metric-icon purple"><Icon name="tags"/></span><div><span>Categories</span><strong>{Object.keys(grouped).length}</strong></div></div></section>
 <div className="menu-category-grid">{Object.entries(grouped).map(([category,items])=><section className="panel" key={category}><div className="panel-head"><div><h2>{category}</h2><p>{(items as any[]).length} configured items</p></div></div><div className="settings-list">{(items as any[]).map(m=><div className="settings-row" key={m.id}><div><strong>{m.name}</strong><span>{m.season} · {m.priceDelta?`+${money(m.priceDelta,data.settings.currencySymbol)}/head`:'Included in base rate'}</span></div><button className={`toggle ${m.active?'on':''}`} onClick={()=>toggle(m.id)} aria-label={`Toggle ${m.name}`}><i/></button></div>)}</div></section>)}</div>
 <Modal open={open} title="Add Menu Item" subtitle="Price delta is added to the base per-head rate whenever this item is selected." onClose={()=>setOpen(false)}><form onSubmit={submit}><div className="form-grid form-grid-2"><label className="field"><span>Item Name *</span><input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label className="field"><span>Category</span><Select value={form.category} options={categories} onChange={v=>setForm({...form,category:v})}/></label><label className="field"><span>Additional PKR / Head</span><input type="number" min="0" value={form.priceDelta} onChange={e=>setForm({...form,priceDelta:Number(e.target.value)})}/></label><label className="field"><span>Season</span><Select value={form.season} options={seasons} onChange={v=>setForm({...form,season:v})}/></label></div><div className="modal-actions"><button type="button" className="btn" onClick={()=>setOpen(false)}>Cancel</button><button className="btn btn-primary">Add Item</button></div></form></Modal>{toast?<Toast message={toast.m} type={toast.t} onClose={()=>setToast(null)}/>:null}</>;
}
