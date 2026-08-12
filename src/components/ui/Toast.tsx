'use client';

import { useEffect } from 'react';
import { Icon } from './Icon';

export function Toast({ message, type = 'success', onClose }: { message: string; type?: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const id = setTimeout(onClose, 3200); return () => clearTimeout(id); }, [onClose]);
  return <div className={`toast ${type === 'error' ? 'toast-error' : ''}`} role="status"><Icon name={type === 'error' ? 'exclamation-circle' : 'check-circle'} /><span>{message}</span><button onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>;
}
