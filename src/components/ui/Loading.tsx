export function Loading({ label='Loading workspace…' }: { label?: string }) { return <div className="loading-state"><span className="spinner"/><span>{label}</span></div>; }
