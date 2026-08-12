import type { CSSProperties } from 'react';

export function Icon({ name, className = '', size = 16, title }: { name: string; className?: string; size?: number; title?: string }) {
  const style: CSSProperties = { width: size, height: size, fontSize: size, lineHeight: 1 };
  return <i className={`bi bi-${name} app-icon ${className}`} style={style} aria-hidden={title ? undefined : true} title={title} />;
}
