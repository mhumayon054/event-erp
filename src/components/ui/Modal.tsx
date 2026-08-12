'use client';
import { Icon } from './Icon';
export function Modal({ open, title, subtitle, onClose, children, width='760px' }: { open:boolean;title:string;subtitle?:string;onClose:()=>void;children:React.ReactNode;width?:string }) {
  if(!open)return null;
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="modal-card" style={{maxWidth:width}} role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><div><h2>{title}</h2>{subtitle?<p>{subtitle}</p>:null}</div><button type="button" className="icon-button" onClick={onClose} aria-label="Close"><Icon name="x-lg"/></button></div><div className="modal-body">{children}</div></section></div>;
}
