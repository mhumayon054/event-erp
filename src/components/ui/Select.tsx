'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export type SelectOption = { value: string; label: string; disabled?: boolean };

export function Select({ value, options, onChange, placeholder = 'Select…', className = '', compact = false, disabled = false, ariaLabel }: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState({ left: 0, top: 0, width: 220 });
  const [active, setActive] = useState(0);
  const selected = options.find((o) => o.value === value);

  const enabledOptions = useMemo(() => options.filter((o) => !o.disabled), [options]);

  function position() {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const desired = Math.max(r.width, 180);
    const width = Math.min(desired, window.innerWidth - 20);
    const left = Math.min(Math.max(10, r.left), window.innerWidth - width - 10);
    const menuHeight=Math.min(310,options.length*33+10);
    const below=r.bottom+5;
    const top=below+menuHeight>window.innerHeight&&r.top>menuHeight+10?Math.max(10,r.top-menuHeight-5):below;
    setRect({ left, top, width });
  }

  useLayoutEffect(() => { if (open) position(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const current = Math.max(0, enabledOptions.findIndex((o) => o.value === value));
    setActive(current);
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const reposition = () => position();
    document.addEventListener('mousedown', close);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open, enabledOptions, value]);

  function choose(next: string) { onChange(next); setOpen(false); buttonRef.current?.focus(); }
  function keyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open && ['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); setOpen(true); return; }
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(enabledOptions.length - 1, i + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const option = enabledOptions[active]; if (option) choose(option.value); }
  }

  return <>
    <button ref={buttonRef} type="button" className={`custom-select ${compact ? 'compact' : ''} ${open ? 'open' : ''} ${className}`} onClick={() => !disabled && setOpen((v) => !v)} onKeyDown={keyDown} disabled={disabled} aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}>
      <span className={selected ? '' : 'placeholder'}>{selected?.label || placeholder}</span>
      <Icon name="chevron-down" size={11}/>
    </button>
    {open && typeof document !== 'undefined' ? createPortal(
      <div ref={menuRef} className="select-popover" style={{ left: rect.left, top: rect.top, width: rect.width }} role="listbox">
        <div className="select-options">
          {options.map((option) => {
            const enabledIndex = enabledOptions.findIndex((o) => o.value === option.value);
            const isActive = enabledIndex === active;
            const isSelected = option.value === value;
            return <button key={`${option.value}-${option.label}`} type="button" disabled={option.disabled} className={`${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`} onMouseEnter={() => enabledIndex >= 0 && setActive(enabledIndex)} onClick={() => !option.disabled && choose(option.value)} role="option" aria-selected={isSelected}>
              <span>{option.label}</span>{isSelected ? <Icon name="check2" size={13}/> : null}
            </button>;
          })}
        </div>
      </div>, document.body) : null}
  </>;
}
