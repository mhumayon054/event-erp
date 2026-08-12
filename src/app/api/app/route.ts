import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createAudit, createReadinessForBooking, hashPassword, makeId, mutateData, nextCode, readData, verifyPassword } from '@/lib/store';
import type { Booking, BookingMenuSelection, InquiryStatus } from '@/lib/types';
import { bookingReceiptMessage, deliverMessage, paymentReminderMessage, vendorTaskMessage } from '@/lib/whatsapp';
import { createTemporaryDemoUser, revokeTemporaryDemoUser } from '@/lib/demo-access';

export const dynamic = 'force-dynamic';

function unauthorized() { return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }); }
function num(v: unknown, fallback = 0) { const n = Number(v); return Number.isFinite(n) ? n : fallback; }
function text(v: unknown) { return String(v ?? '').trim(); }

function bookingFinancials(data: ReturnType<typeof readData>, bookingId: string) {
  const booking = data.bookings.find((b) => b.id === bookingId);
  if (!booking) return { paid: 0, balance: 0 };
  const paid = data.payments.filter((p) => p.bookingId === bookingId && p.status === 'verified').reduce((s, p) => s + p.amount, 0);
  return { paid, balance: Math.max(0, booking.totalAmount - paid) };
}

function dashboard(data: ReturnType<typeof readData>) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const in7 = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const confirmed = data.bookings.filter((b) => b.status === 'confirmed');
  const totalCollected = data.payments.filter((p) => p.status === 'verified').reduce((s, p) => s + p.amount, 0);
  const pendingBalance = confirmed.reduce((s, b) => s + bookingFinancials(data, b.id).balance, 0);
  const upcoming = confirmed.filter((b) => b.eventDate >= todayStr && b.eventDate <= in7).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const upcomingDetailed = upcoming.map((b) => {
    const items = data.readiness.filter((r) => r.bookingId === b.id);
    const readiness = items.length ? Math.round(items.filter((x) => x.done).length / items.length * 100) : 0;
    return { ...b, hallName: data.halls.find((h) => h.id === b.hallId)?.name || '—', readiness, ...bookingFinancials(data, b.id) };
  });
  return {
    stats: {
      confirmedBookings: confirmed.length,
      collected: totalCollected,
      pendingBalance,
      followUps: data.inquiries.filter((i) => ['new', 'follow_up', 'tentative'].includes(i.status)).length,
      upcoming7: upcoming.length
    },
    upcoming: upcomingDetailed,
    recentPayments: data.payments.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6).map((p) => ({ ...p, booking: data.bookings.find((b) => b.id === p.bookingId) })),
    attention: upcomingDetailed.filter((b) => b.readiness < 100 || b.balance > 0).slice(0, 8)
  };
}

export async function GET(request: Request) {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  const data = readData();
  const url = new URL(request.url);
  const resource = url.searchParams.get('resource') || 'bootstrap';
  const safeUser = user;

  if (resource === 'bootstrap') return NextResponse.json({ ok: true, user: safeUser, settings: data.settings, halls: data.halls });
  if (resource === 'dashboard') return NextResponse.json({ ok: true, ...dashboard(data), settings: data.settings });
  if (resource === 'bookings') return NextResponse.json({ ok: true, bookings: data.bookings.slice().sort((a, b) => b.eventDate.localeCompare(a.eventDate)).map((b) => ({ ...b, hallName: data.halls.find((h) => h.id === b.hallId)?.name || '—', ...bookingFinancials(data, b.id), readiness: (() => { const items=data.readiness.filter(r=>r.bookingId===b.id); return items.length?Math.round(items.filter(x=>x.done).length/items.length*100):0; })() })), halls: data.halls, menuItems: data.menuItems.filter((m) => m.active), settings: data.settings });
  if (resource === 'inquiries') return NextResponse.json({ ok: true, inquiries: data.inquiries.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)), halls: data.halls });
  if (resource === 'menu') return NextResponse.json({ ok: true, menuItems: data.menuItems.slice().sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name)), settings: data.settings });
  if (resource === 'payments') return NextResponse.json({ ok: true, payments: data.payments.slice().sort((a,b)=>b.paidAt.localeCompare(a.paidAt)).map((p)=>({ ...p, booking:data.bookings.find(b=>b.id===p.bookingId) })), bookings: data.bookings.filter(b=>b.status==='confirmed').map((b)=>({ ...b, ...bookingFinancials(data,b.id) })), settings:data.settings });
  if (resource === 'vendors') return NextResponse.json({ ok: true, vendors:data.vendors, tasks:data.vendorTasks.map(t=>({...t, vendor:data.vendors.find(v=>v.id===t.vendorId), booking:data.bookings.find(b=>b.id===t.bookingId)})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)), bookings:data.bookings.filter(b=>b.status==='confirmed') });
  if (resource === 'operations') return NextResponse.json({ ok:true, settings:data.settings, bookings:data.bookings.filter(b=>b.status==='confirmed').sort((a,b)=>a.eventDate.localeCompare(b.eventDate)).map(b=>({ ...b, hallName:data.halls.find(h=>h.id===b.hallId)?.name||'—', financials:bookingFinancials(data,b.id), readiness:data.readiness.filter(r=>r.bookingId===b.id), tasks:data.vendorTasks.filter(t=>t.bookingId===b.id).map(t=>({...t,vendor:data.vendors.find(v=>v.id===t.vendorId)})) })) });
  if (resource === 'reports') return NextResponse.json({ ok:true, dashboard:dashboard(data), bookings:data.bookings, payments:data.payments, inquiries:data.inquiries, settings:data.settings });
  if (resource === 'settings') {
    if (user.role === 'demo') return NextResponse.json({ok:false,error:'Demo access cannot open workspace settings.'},{status:403});
    const now=Date.now();
    const demoAccess=data.users.filter(u=>u.role==='demo').map(u=>({id:u.id,name:u.name,username:u.username,accessLabel:u.accessLabel||u.name,active:u.active!==false,expiresAt:u.expiresAt||'',expired:!!u.expiresAt&&new Date(u.expiresAt).getTime()<=now,createdAt:u.createdAt||''})).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ ok:true, settings:data.settings, halls:data.halls, automations:{...data.automations, cloudApiToken:data.automations.cloudApiToken?'••••••••':''}, user:safeUser, demoAccess });
  }
  if (resource === 'audit') { if(user.role==='demo') return NextResponse.json({ok:false,error:'Audit history is not available in demo access.'},{status:403}); return NextResponse.json({ ok:true, logs:data.auditLogs.slice(0,500) }); }
  if (resource === 'automations') return NextResponse.json({ ok:true, settings:{...data.automations,cloudApiToken:data.automations.cloudApiToken?'••••••••':''}, logs:data.automationLogs.slice(0,150), bookings:data.bookings.filter(b=>b.status==='confirmed').map(b=>({...b,...bookingFinancials(data,b.id)})), readOnlyConfig:user.role==='demo' });
  return NextResponse.json({ ok:false, error:'Unknown resource' }, { status:404 });
}

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user) return unauthorized();
  const body = await request.json().catch(() => ({}));
  const action = text(body.action);

  try {
    const result = await mutateData(async (data) => {
      if (user.role === 'demo' && ['saveSettings','addHall','toggleHall','saveAutomations','changePassword','clearOperationalData','createDemoAccess','revokeDemoAccess'].includes(action)) throw new Error('This setting is locked in demo access.');
      if (action === 'createInquiry') {
        const now = new Date().toISOString();
        const inquiry = {
          id: makeId('inq'), code: nextCode('INQ', data.inquiries), customerName:text(body.customerName), phone:text(body.phone), eventDate:text(body.eventDate), shift:text(body.shift)||'Evening', eventType:text(body.eventType)||'Wedding', guests:num(body.guests), budget:num(body.budget), source:text(body.source)||'Walk-in', status:'new' as InquiryStatus, notes:text(body.notes), nextFollowUp:text(body.nextFollowUp), createdAt:now, updatedAt:now
        };
        if (!inquiry.customerName || !inquiry.phone) throw new Error('Customer name and phone are required.');
        data.inquiries.unshift(inquiry);
        createAudit(data,user.name,'Created','Inquiry',inquiry.id,`${inquiry.code} created for ${inquiry.customerName}.`);
        return { inquiry };
      }
      if (action === 'updateInquiry') {
        const inquiry=data.inquiries.find(i=>i.id===text(body.id)); if(!inquiry) throw new Error('Inquiry not found.');
        const before=inquiry.status;
        if(body.status) inquiry.status=body.status as InquiryStatus;
        if(body.notes!==undefined) inquiry.notes=text(body.notes);
        if(body.nextFollowUp!==undefined) inquiry.nextFollowUp=text(body.nextFollowUp);
        inquiry.updatedAt=new Date().toISOString();
        createAudit(data,user.name,'Updated','Inquiry',inquiry.id,`${inquiry.code} status ${before} → ${inquiry.status}.`);
        return { inquiry };
      }
      if (action === 'createBooking') {
        const now=new Date().toISOString();
        const status = body.status === 'hold' ? 'hold' : 'confirmed';
        const hallId=text(body.hallId); const eventDate=text(body.eventDate); const shift=text(body.shift);
        if(!hallId||!eventDate||!shift) throw new Error('Hall, event date and shift are required.');
        const conflict=data.bookings.find(b=>b.hallId===hallId&&b.eventDate===eventDate&&b.shift===shift&&['hold','confirmed'].includes(b.status));
        if(conflict) throw new Error(`This hall/shift is already ${conflict.status} under ${conflict.code}.`);
        const selections:Array<BookingMenuSelection>=Array.isArray(body.menuItemIds)?body.menuItemIds.map((mid:string)=>data.menuItems.find(m=>m.id===mid)).filter(Boolean).map((m:any)=>({itemId:m.id,name:m.name,category:m.category,priceDelta:m.priceDelta})):[];
        const baseRate=num(body.baseRate,data.settings.defaultBaseRate); const perHeadRate=baseRate+selections.reduce((s,m)=>s+m.priceDelta,0); const guests=num(body.guests); const stageCost=num(body.stageCost); const otherCharges=num(body.otherCharges); const discount=num(body.discount); const total=Math.max(0,guests*perHeadRate+stageCost+otherCharges-discount);
        const booking:Booking={id:makeId('book'),code:nextCode('BK',data.bookings),inquiryId:text(body.inquiryId)||undefined,customerName:text(body.customerName),phone:text(body.phone),eventDate,shift,hallId,eventType:text(body.eventType)||'Wedding',guests,status,holdExpiresAt:status==='hold'?new Date(Date.now()+data.settings.holdMinutes*60000).toISOString():undefined,baseRate,stageName:text(body.stageName),stageCost,otherCharges,discount,menuSelections:selections,perHeadRate,totalAmount:total,notes:text(body.notes),specialInstructions:text(body.specialInstructions),arrivalTime:text(body.arrivalTime),dinnerTime:text(body.dinnerTime),finalized:false,createdAt:now,updatedAt:now};
        if(!booking.customerName||!booking.phone||booking.guests<=0) throw new Error('Customer, phone and guest count are required.');
        const hall=data.halls.find(h=>h.id===hallId); if(hall&&(guests<hall.minCapacity||guests>hall.maxCapacity)) throw new Error(`${hall.name} capacity is ${hall.minCapacity}-${hall.maxCapacity} guests.`);
        data.bookings.unshift(booking); createReadinessForBooking(data,booking);
        const advance=num(body.advance);
        let payment:any=null;
        if(advance>0){payment={id:makeId('pay'),bookingId:booking.id,amount:advance,method:text(body.paymentMethod)||'Cash',reference:text(body.paymentReference),status:'verified' as const,paidAt:new Date().toISOString().slice(0,10),notes:'Advance received at booking',createdAt:now};data.payments.unshift(payment);createAudit(data,user.name,'Payment recorded','Payment',payment.id,`${booking.code}: ${advance.toLocaleString()} advance via ${payment.method}.`);}
        if(booking.inquiryId){const inq=data.inquiries.find(i=>i.id===booking.inquiryId); if(inq){inq.status=status==='hold'?'hold':'confirmed';inq.updatedAt=now;}}
        createAudit(data,user.name,status==='hold'?'Held':'Confirmed','Booking',booking.id,`${booking.code} ${status} for ${booking.customerName} on ${booking.eventDate} ${booking.shift}.`);
        let whatsapp:any=null;
        if(status==='confirmed'&&data.automations.bookingReceipt){whatsapp=await deliverMessage(data,'booking_receipt',booking.phone,bookingReceiptMessage(data,booking.id),{forceLink:user.role==='demo'});}
        return { booking, payment, whatsapp };
      }
      if (action === 'updateBooking') {
        const booking=data.bookings.find(b=>b.id===text(body.id)); if(!booking) throw new Error('Booking not found.');
        if(booking.finalized && body.force!==true) throw new Error('Booking is finalized. Unlock it before changing event details.');
        const changes:string[]=[];
        const set=(key:keyof Booking,value:any,label:string)=>{if(value!==undefined&&booking[key]!==value){changes.push(`${label}: ${String(booking[key])} → ${String(value)}`);(booking as any)[key]=value;}};
        set('guests',body.guests!==undefined?num(body.guests):undefined,'Guests'); set('stageName',body.stageName!==undefined?text(body.stageName):undefined,'Stage'); set('stageCost',body.stageCost!==undefined?num(body.stageCost):undefined,'Stage cost'); set('specialInstructions',body.specialInstructions!==undefined?text(body.specialInstructions):undefined,'Instructions'); set('arrivalTime',body.arrivalTime!==undefined?text(body.arrivalTime):undefined,'Arrival'); set('dinnerTime',body.dinnerTime!==undefined?text(body.dinnerTime):undefined,'Dinner');
        if(Array.isArray(body.menuItemIds)){const selections=body.menuItemIds.map((mid:string)=>data.menuItems.find(m=>m.id===mid)).filter(Boolean).map((m:any)=>({itemId:m.id,name:m.name,category:m.category,priceDelta:m.priceDelta})); booking.menuSelections=selections; changes.push('Menu selection updated.');}
        booking.perHeadRate=booking.baseRate+booking.menuSelections.reduce((s,m)=>s+m.priceDelta,0); booking.totalAmount=Math.max(0,booking.guests*booking.perHeadRate+booking.stageCost+booking.otherCharges-booking.discount); booking.updatedAt=new Date().toISOString();
        createAudit(data,user.name,'Updated','Booking',booking.id,changes.length?`${booking.code}: ${changes.join(' | ')}`:`${booking.code} updated.`); return { booking };
      }
      if (action === 'setBookingStatus') {
        const booking=data.bookings.find(b=>b.id===text(body.id)); if(!booking) throw new Error('Booking not found.');
        const next=text(body.status) as Booking['status']; const before=booking.status;
        if(next==='confirmed'){const conflict=data.bookings.find(b=>b.id!==booking.id&&b.hallId===booking.hallId&&b.eventDate===booking.eventDate&&b.shift===booking.shift&&['hold','confirmed'].includes(b.status));if(conflict)throw new Error(`Cannot confirm; ${conflict.code} already occupies this slot.`);}
        booking.status=next; booking.holdExpiresAt=next==='hold'?new Date(Date.now()+data.settings.holdMinutes*60000).toISOString():undefined; booking.updatedAt=new Date().toISOString();
        createAudit(data,user.name,'Status changed','Booking',booking.id,`${booking.code}: ${before} → ${next}.`);
        let whatsapp:any=null;if(next==='confirmed'&&data.automations.bookingReceipt){whatsapp=await deliverMessage(data,'booking_receipt',booking.phone,bookingReceiptMessage(data,booking.id),{forceLink:user.role==='demo'});}
        return { booking, whatsapp };
      }
      if (action === 'toggleFinalize') {
        const booking=data.bookings.find(b=>b.id===text(body.id));if(!booking)throw new Error('Booking not found.'); booking.finalized=!booking.finalized; booking.updatedAt=new Date().toISOString(); createAudit(data,user.name,booking.finalized?'Finalized':'Unlocked','Booking',booking.id,`${booking.code} ${booking.finalized?'finalized for operations':'unlocked for editing'}.`);return { booking };
      }
      if (action === 'recordPayment') {
        const booking=data.bookings.find(b=>b.id===text(body.bookingId));if(!booking)throw new Error('Booking not found.');const amount=num(body.amount);if(amount<=0)throw new Error('Enter a valid payment amount.');
        const payment={id:makeId('pay'),bookingId:booking.id,amount,method:text(body.method)||'Cash',reference:text(body.reference),status:(body.status==='pending'?'pending':'verified') as 'pending'|'verified',paidAt:text(body.paidAt)||new Date().toISOString().slice(0,10),notes:text(body.notes),createdAt:new Date().toISOString()};data.payments.unshift(payment);
        createAudit(data,user.name,'Payment recorded','Payment',payment.id,`${booking.code}: ${amount.toLocaleString()} via ${payment.method}.`);
        const financials=bookingFinancials(data,booking.id); const ready=data.readiness.find(r=>r.bookingId===booking.id&&r.key==='payment'); if(ready&&financials.balance<=0)ready.done=true;
        return { payment, financials };
      }
      if (action === 'createMenuItem') {
        const item={id:makeId('menu'),name:text(body.name),category:text(body.category)||'Extra',priceDelta:num(body.priceDelta),active:true,season:text(body.season)||'All year'};if(!item.name)throw new Error('Menu item name is required.');data.menuItems.push(item);createAudit(data,user.name,'Created','Menu',item.id,`${item.name} added to ${item.category}.`);return { item };
      }
      if (action === 'toggleMenuItem') {const item=data.menuItems.find(m=>m.id===text(body.id));if(!item)throw new Error('Menu item not found.');item.active=!item.active;createAudit(data,user.name,'Updated','Menu',item.id,`${item.name} ${item.active?'activated':'retired'}.`);return { item };}
      if (action === 'createVendor') {const vendor={id:makeId('vendor'),name:text(body.name),category:text(body.category)||'Other',phone:text(body.phone),notes:text(body.notes),active:true};if(!vendor.name||!vendor.phone)throw new Error('Vendor name and phone are required.');data.vendors.push(vendor);createAudit(data,user.name,'Created','Vendor',vendor.id,`${vendor.name} added as ${vendor.category}.`);return{vendor};}
      if (action === 'createVendorTask') {const booking=data.bookings.find(b=>b.id===text(body.bookingId));const vendor=data.vendors.find(v=>v.id===text(body.vendorId));if(!booking||!vendor)throw new Error('Booking and vendor are required.');const task={id:makeId('task'),bookingId:booking.id,vendorId:vendor.id,title:text(body.title)||`${vendor.category} task`,instructions:text(body.instructions),dueAt:text(body.dueAt),status:'pending' as const,createdAt:new Date().toISOString()};data.vendorTasks.unshift(task);createAudit(data,user.name,'Assigned','Vendor task',task.id,`${vendor.name} assigned to ${booking.code}.`);let whatsapp:any=null;if(data.automations.vendorAlert){whatsapp=await deliverMessage(data,'vendor_alert',vendor.phone,vendorTaskMessage(data,task.id),{forceLink:user.role==='demo'});}return{task,whatsapp};}
      if (action === 'updateVendorTask') {const task=data.vendorTasks.find(t=>t.id===text(body.id));if(!task)throw new Error('Task not found.');task.status=body.status;createAudit(data,user.name,'Updated','Vendor task',task.id,`${task.title} marked ${task.status}.`);return{task};}
      if (action === 'toggleReadiness') {const item=data.readiness.find(r=>r.id===text(body.id));if(!item)throw new Error('Readiness item not found.');item.done=!item.done;createAudit(data,user.name,'Checklist','Readiness',item.id,`${item.label}: ${item.done?'done':'pending'}.`);return{item};}
      if (action === 'saveSettings') {const incoming=body.settings||{};data.settings={...data.settings,...incoming,defaultBaseRate:num(incoming.defaultBaseRate,data.settings.defaultBaseRate),advancePercent:num(incoming.advancePercent,data.settings.advancePercent),holdMinutes:num(incoming.holdMinutes,data.settings.holdMinutes)};createAudit(data,user.name,'Updated','Settings','venue','Venue settings updated.');return{settings:data.settings};}
      if (action === 'addHall') {const hall={id:makeId('hall'),name:text(body.name),minCapacity:num(body.minCapacity),maxCapacity:num(body.maxCapacity),active:true};if(!hall.name||hall.maxCapacity<=0||hall.minCapacity>hall.maxCapacity)throw new Error('Enter a valid hall name and capacity range.');data.halls.push(hall);createAudit(data,user.name,'Created','Hall',hall.id,`${hall.name} added (${hall.minCapacity}-${hall.maxCapacity}).`);return{hall};}
      if (action === 'toggleHall') {const hall=data.halls.find(h=>h.id===text(body.id));if(!hall)throw new Error('Hall not found.');hall.active=!hall.active;createAudit(data,user.name,'Updated','Hall',hall.id,`${hall.name} ${hall.active?'activated':'disabled'}.`);return{hall};}
      if (action === 'saveAutomations') {const incoming=body.automations||{};const token=text(incoming.cloudApiToken);data.automations={...data.automations,...incoming,cloudApiToken:token==='••••••••'?data.automations.cloudApiToken:token};createAudit(data,user.name,'Updated','Automations','whatsapp','WhatsApp automation settings updated.');return{automations:{...data.automations,cloudApiToken:data.automations.cloudApiToken?'••••••••':''}};}
      if (action === 'sendPaymentReminder') {const booking=data.bookings.find(b=>b.id===text(body.bookingId));if(!booking)throw new Error('Booking not found.');return{whatsapp:await deliverMessage(data,'payment_reminder',booking.phone,paymentReminderMessage(data,booking.id),{forceLink:user.role==='demo'})};}
      if (action === 'createDemoAccess') {
        if(user.role!=='owner')throw new Error('Owner access required.');
        const created=createTemporaryDemoUser(data,text(body.accessLabel),num(body.durationHours,72));
        const demo=created.user;createAudit(data,user.name,'Created','Demo access',demo.id,`${demo.accessLabel||demo.name} temporary access created until ${demo.expiresAt}.`);
        return{access:{id:demo.id,name:demo.name,username:demo.username,expiresAt:demo.expiresAt,active:true},credentials:created.credentials};
      }
      if (action === 'revokeDemoAccess') {
        if(user.role!=='owner')throw new Error('Owner access required.');
        const demo=revokeTemporaryDemoUser(data,text(body.id));createAudit(data,user.name,'Revoked','Demo access',demo.id,`${demo.accessLabel||demo.name} access revoked.`);return{ok:true};
      }
      if (action === 'changePassword') {const u=data.users.find(x=>x.id===user.id);if(!u)throw new Error('User not found.');if(!verifyPassword(u,text(body.currentPassword)))throw new Error('Current password is incorrect.');const np=text(body.newPassword);if(np.length<8)throw new Error('New password must be at least 8 characters.');const hp=hashPassword(np);u.passwordSalt=hp.salt;u.passwordHash=hp.hash;u.mustChangePassword=false;createAudit(data,user.name,'Updated','User',u.id,'Account password changed.');return{ok:true};}
      if (action === 'seedDemo') {
        if(data.bookings.length||data.inquiries.length||data.payments.length) throw new Error('Demo data can only be loaded into an empty workspace.');
        const today=new Date(); const d=(plus:number)=>{const x=new Date(today.getTime()+plus*86400000);return x.toISOString().slice(0,10)}; const now=new Date().toISOString();
        const inq={id:makeId('inq'),code:nextCode('INQ',data.inquiries),customerName:'Hamza Khan',phone:'+92 300 5551234',eventDate:d(18),shift:'Evening',eventType:'Walima',guests:320,budget:1100000,source:'WhatsApp',status:'follow_up' as const,notes:'Family will confirm stage package.',nextFollowUp:d(1),createdAt:now,updatedAt:now};data.inquiries.push(inq);
        const sampleBooking=(name:string,phone:string,plus:number,hallId:string,guests:number,stage:string,stageCost:number):Booking=>{const sels=data.menuItems.slice(0,5).map(m=>({itemId:m.id,name:m.name,category:m.category,priceDelta:m.priceDelta}));const base=data.settings.defaultBaseRate;const phr=base+sels.reduce((s,m)=>s+m.priceDelta,0);return{id:makeId('book'),code:nextCode('BK',data.bookings),customerName:name,phone,eventDate:d(plus),shift:'Evening',hallId,eventType:'Wedding',guests,status:'confirmed',baseRate:base,stageName:stage,stageCost,otherCharges:0,discount:0,menuSelections:sels,perHeadRate:phr,totalAmount:guests*phr+stageCost,notes:'',specialInstructions:'VIP family table near stage.',arrivalTime:'18:30',dinnerTime:'21:00',finalized:false,createdAt:now,updatedAt:now};};
        const b1=sampleBooking('Ali Raza','+92 301 1112233',2,data.halls[0].id,420,'Classic Ivory',90000);data.bookings.push(b1);createReadinessForBooking(data,b1);const b2=sampleBooking('Usman Shah','+92 302 3334455',5,data.halls[1].id,210,'Emerald Floral',65000);data.bookings.push(b2);createReadinessForBooking(data,b2);data.readiness.filter(r=>r.bookingId===b1.id).slice(0,4).forEach(r=>r.done=true);
        data.payments.push({id:makeId('pay'),bookingId:b1.id,amount:350000,method:'Bank Transfer',reference:'TXN-10021',status:'verified',paidAt:d(0),notes:'Advance received',createdAt:now},{id:makeId('pay'),bookingId:b2.id,amount:200000,method:'Cash',reference:'REC-10022',status:'verified',paidAt:d(0),notes:'Advance received',createdAt:now});
        createAudit(data,user.name,'Loaded','Demo','workspace','Demo workspace data loaded.');return{ok:true};
      }
      if (action === 'clearOperationalData') {if(user.role!=='owner')throw new Error('Owner access required.');data.inquiries=[];data.bookings=[];data.payments=[];data.vendorTasks=[];data.readiness=[];data.automationLogs=[];createAudit(data,user.name,'Cleared','Workspace','operations','Operational data cleared.');return{ok:true};}
      throw new Error('Unknown action.');
    });
    return NextResponse.json({ ok:true, ...result });
  } catch (error) {
    return NextResponse.json({ ok:false, error:error instanceof Error?error.message:'Request failed.' }, { status:400 });
  }
}
